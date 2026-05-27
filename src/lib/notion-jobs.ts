import { Client, type CreatePageParameters, type UpdatePageParameters } from "@notionhq/client";
import type { JobStatus, TrackedJob } from "@/types";
import { needsAppliedAt, todayIsoDate } from "@/lib/tracked-job-utils";

export interface NotionCredentials {
  token: string;
  dataSourceId: string;
}

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

const validatedDataSourceIds = new Set<string>();

async function ensureDataSource(
  notion: Client,
  dataSourceId: string,
): Promise<void> {
  if (validatedDataSourceIds.has(dataSourceId)) return;
  await notion.dataSources.retrieve({ data_source_id: dataSourceId });
  validatedDataSourceIds.add(dataSourceId);
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

async function syncJobToNotionOnce(
  creds: NotionCredentials,
  job: TrackedJob,
): Promise<TrackedJob> {
  const notion = new Client({ auth: creds.token });
  const dataSourceId = normalizeNotionId(creds.dataSourceId);
  await ensureDataSource(notion, dataSourceId);

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

export function syncJobToNotion(
  creds: NotionCredentials,
  job: TrackedJob,
): Promise<TrackedJob> {
  const pending = inFlightByJobId.get(job.id);
  if (pending) return pending;

  const work = syncJobToNotionOnce(creds, job).finally(() => {
    inFlightByJobId.delete(job.id);
  });
  inFlightByJobId.set(job.id, work);
  return work;
}

export async function syncJobsToNotion(
  creds: NotionCredentials,
  jobs: TrackedJob[],
): Promise<TrackedJob[]> {
  const results: TrackedJob[] = [];
  for (const job of jobs) {
    results.push(await syncJobToNotion(creds, job));
  }
  return results;
}
