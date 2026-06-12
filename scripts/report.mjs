import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../lib/csv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const paths = {
  contacts: path.join(root, "data", "kontakty.csv"),
  replies: path.join(root, "data", "odpovedi.csv"),
  activity: path.join(root, "data", "aktivita.csv"),
  outboxIndex: path.join(root, "outbox", "index.csv"),
  reports: path.join(root, "reports"),
  report: path.join(root, "reports", "prehled.md")
};

async function readCsvIfExists(file) {
  try {
    return parseCsv(await fs.readFile(file, "utf8"));
  } catch {
    return [];
  }
}

function latestBy(rows, key) {
  const latest = new Map();
  for (const row of rows) {
    latest.set(row[key], row);
  }
  return latest;
}

const contacts = await readCsvIfExists(paths.contacts);
const replies = await readCsvIfExists(paths.replies);
const activity = await readCsvIfExists(paths.activity);
const drafts = await readCsvIfExists(paths.outboxIndex);
const latestReply = latestBy(replies, "contact_id");
const latestDraft = latestBy(drafts, "contact_id");

const byStatus = contacts.reduce((counts, contact) => {
  counts[contact.status] = (counts[contact.status] ?? 0) + 1;
  return counts;
}, {});

const lines = [
  "# Přehled polského gastro agenta",
  "",
  `Vygenerováno: ${new Date().toLocaleString("cs-CZ")}`,
  "",
  "## Souhrn",
  "",
  `- kontaktů celkem: ${contacts.length}`,
  `- návrhů e-mailů: ${drafts.length}`,
  `- zapsaných odpovědí: ${replies.length}`,
  `- aktivit v deníku: ${activity.length}`,
  "",
  "## Kontakty podle stavu",
  ""
];

for (const [status, count] of Object.entries(byStatus)) {
  lines.push(`- ${status || "bez stavu"}: ${count}`);
}

lines.push("", "## Kontakty", "");
lines.push("| ID | Název | Typ | Město | Stav | Poslední draft | Poslední odpověď | Další krok |");
lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");

for (const contact of contacts) {
  const draft = latestDraft.get(contact.id);
  const reply = latestReply.get(contact.id);
  lines.push([
    contact.id,
    contact.nazev,
    contact.typ,
    contact.mesto,
    contact.status,
    draft?.status ? `${draft.status} (${draft.file})` : "",
    reply?.interest ? `${reply.interest}: ${reply.summary}` : "",
    reply?.next_step || contact.next_step || ""
  ].map((value) => String(value ?? "").replaceAll("|", "\\|")).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
}

await fs.mkdir(paths.reports, { recursive: true });
await fs.writeFile(paths.report, `${lines.join("\n")}\n`, "utf8");
console.log(`Přehled vytvořen: ${path.relative(root, paths.report)}`);
