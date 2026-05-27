import { readFileSync } from "fs";
import { resolve } from "path";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      const v = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      return [l.slice(0, i), v];
    }),
);

const url = new URL("https://serpapi.com/search.json");
url.searchParams.set("engine", "google_jobs");
url.searchParams.set("q", "Software Engineering Intern");
url.searchParams.set("location", "San Jose, California, United States");
url.searchParams.set("hl", "en");
url.searchParams.set("api_key", env.SERPAPI_API_KEY);

const res = await fetch(url);
const json = await res.json();
console.log("jobs count:", json.jobs_results?.length ?? 0);
console.log("serpapi_pagination:", JSON.stringify(json.serpapi_pagination, null, 2));
console.log("error:", json.error);
