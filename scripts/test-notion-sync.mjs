/**
 * Push dummy jobs to Notion via the sync API. Run from project root:
 *   node scripts/test-notion-sync.mjs
 * Requires: npm run dev (in another terminal)
 */
const dummyJobs = [
  {
    id: "jobhawk-test-saved-001",
    title: "Software Engineering Intern (Test)",
    company: "Acme Corp",
    location: "San Jose, CA",
    url: "https://example.com/jobs/intern-test",
    status: "saved",
  },
  {
    id: "jobhawk-test-applied-002",
    title: "Firmware Intern (Test)",
    company: "Beta Devices",
    location: "Remote",
    url: "https://example.com/jobs/firmware-test",
    status: "applied",
    appliedAt: new Date().toISOString().slice(0, 10),
  },
];

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function main() {
  console.log(`POST ${base}/api/integrations/notion/sync`);
  const res = await fetch(`${base}/api/integrations/notion/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobs: dummyJobs }),
  });
  const json = await res.json();
  console.log("Status:", res.status);
  console.log(JSON.stringify(json, null, 2));
  if (!json.success) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
