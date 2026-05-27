import { Client } from "@notionhq/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      const v = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      return [l.slice(0, i), v];
    }),
);

const notion = new Client({ auth: env.NOTION_TOKEN });

const res = await notion.search({
  query: "",
  filter: { value: "data_source", property: "object" },
  page_size: 20,
});

console.log("Data sources found:", res.results.length);
for (const item of res.results) {
  if (item.object === "data_source") {
    console.log("-", item.id, item.title?.[0]?.plain_text ?? "(no title)");
  }
}

const dbRes = await notion.search({
  query: "",
  filter: { value: "database", property: "object" },
  page_size: 20,
});

console.log("\nDatabases found:", dbRes.results.length);
for (const item of dbRes.results) {
  if (item.object === "database") {
    console.log("-", item.id, item.title?.[0]?.plain_text ?? "(no title)");
    if ("data_sources" in item) {
      console.log("  data_sources:", item.data_sources?.map((d) => d.id));
    }
  }
}
