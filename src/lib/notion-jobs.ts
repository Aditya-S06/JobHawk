import { Client, type CreatePageParameters, type UpdatePageParameters } from "@notionhq/client";
import type { JobStatus, TrackedJob } from "@/types";
import { needsAppliedAt, todayIsoDate } from "@/lib/tracked-job-utils";

function normalizeNotionId(id: string): string {
  const trimmed = id.trim().replace(/^["']|["']$/g, "");
  const clean = trimmed.replace(/-/g, "");
  if (clean.length !== 32) return trimmed;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

const PROGRESS_LABELS: Record<JobStatus, string> = {
  saved: "Saved",
  tailoring: "Tailoring",
  applied: "Applied",
  interviewing: "Interviewing",
  rejected: "Rejected",
};

function getNotionConfig() {
  const token = process.env.NOTION_TOKEN;
  const dataSourceId =
    process.env.NOTION_DATA_SOURCE_ID ?? process.env.NOTION_DATABASE_ID;
  if (!token) {
    throw new Error("NOTION_TOKEN must be set in .env.local");
  }
  if (!dataSourceId) {
    throw new Error(
      "Set NOTION_DATA_SOURCE_ID in .env.local to your job table's data source ID",
    );
  }
  return {
    token,
    dataSourceId: normalizeNotionId(dataSourceId),
  };
}

function notionClient(): Client {
  return new Client({ auth: getNotionConfig().token });
}

let validatedDataSourceId: string | null = null;

/** Resolve and validate NOTION_DATA_SOURCE_ID once per process. */
async function getDataSourceId(notion: Client): Promise<string> {
  if (validatedDataSourceId) return validatedDataSourceId;

  const { dataSourceId } = getNotionConfig();
  await notion.dataSources.retrieve({ data_source_id: dataSourceId });
  validatedDataSourceId = dataSourceId;
  return dataSourceId;
}

function buildProperties(job: TrackedJob): CreatePageParameters["properties"] {
  const appliedAt =
    job.appliedAt ??
    (needsAppliedAt(job.status) ? todayIsoDate() : undefined);

  const props: NonNullable<CreatePageParameters["properties"]> = {
    Name: {
      title: [{ text: { content: job.title.slice(0, 2000) } }],
    },
    Company: {
      rich_text: [{ text: { content: job.company.slice(0, 2000) } }],
    },
    Progress: {
      select: { name: PROGRESS_LABELS[job.status] },
    },
    "JobHawk ID": {
      rich_text: [{ text: { content: job.id.slice(0, 2000) } }],
    },
  };

  if (job.url) {
    props.Link = { url: job.url };
  }

  if (appliedAt) {
    props.Applied = { date: { start: appliedAt } };
  }

  return props;
}

async function findPageByJobHawkId(
  notion: Client,
  dataSourceId: string,
  jobHawkId: string,
): Promise<string | null> {
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: {
      property: "JobHawk ID",
      rich_text: { equals: jobHawkId },
    },
    page_size: 1,
  });
  const page = response.results[0];
  if (!page || page.object !== "page" || !("id" in page)) return null;
  return page.id;
}

const inFlightByJobId = new Map<string, Promise<TrackedJob>>();

async function syncJobToNotionOnce(job: TrackedJob): Promise<TrackedJob> {
  const notion = notionClient();
  const dataSourceId = await getDataSourceId(notion);
  const properties = buildProperties(job);

  const appliedAt =
    job.appliedAt ??
    (needsAppliedAt(job.status) ? todayIsoDate() : undefined);

  let pageId = job.notionPageId ?? null;
  if (!pageId) {
    pageId = await findPageByJobHawkId(notion, dataSourceId, job.id);
  }

  if (pageId) {
    await notion.pages.update({
      page_id: pageId,
      properties: properties as UpdatePageParameters["properties"],
    });
  } else {
    const created = await notion.pages.create({
      parent: { data_source_id: dataSourceId },
      properties,
    });
    pageId = created.id;
  }

  return {
    ...job,
    notionPageId: pageId,
    ...(appliedAt ? { appliedAt } : {}),
  };
}

export function syncJobToNotion(job: TrackedJob): Promise<TrackedJob> {
  const pending = inFlightByJobId.get(job.id);
  if (pending) return pending;

  const work = syncJobToNotionOnce(job).finally(() => {
    inFlightByJobId.delete(job.id);
  });
  inFlightByJobId.set(job.id, work);
  return work;
}

export async function syncJobsToNotion(jobs: TrackedJob[]): Promise<TrackedJob[]> {
  const results: TrackedJob[] = [];
  for (const job of jobs) {
    results.push(await syncJobToNotion(job));
  }
  return results;
}
