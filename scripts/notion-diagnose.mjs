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
const id = env.NOTION_DATABASE_ID;

console.log("ID:", id);

for (const label of ["database", "page", "data_source"]) {
  try {
    if (label === "database") {
      const r = await notion.databases.retrieve({ database_id: id });
      console.log("database:", JSON.stringify(r, null, 2).slice(0, 800));
    } else if (label === "page") {
      const r = await notion.pages.retrieve({ page_id: id });
      console.log("page:", JSON.stringify(r, null, 2).slice(0, 800));
    } else {
      const r = await notion.dataSources.retrieve({ data_source_id: id });
      console.log("data_source:", JSON.stringify(r, null, 2).slice(0, 800));
    }
  } catch (e) {
    console.log(`${label} error:`, e.message);
  }
}
