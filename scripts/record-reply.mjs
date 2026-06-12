import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendCsvLine, nowIso, parseCsv } from "../lib/csv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const paths = {
  contacts: path.join(root, "data", "kontakty.csv"),
  replies: path.join(root, "data", "odpovedi.csv"),
  activity: path.join(root, "data", "aktivita.csv")
};

function arg(name, fallback = "") {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const contactId = arg("contact");
const interest = arg("interest", "nevyhodnoceno");
const summary = arg("summary", "DOPLNIT_SHRNUTI");
const nextStep = arg("next", "DOPLNIT_DALSI_KROK");
const messageId = arg("message", "");

if (!contactId) {
  console.error("Chybí --contact=K001");
  process.exit(1);
}

const contacts = parseCsv(await fs.readFile(paths.contacts, "utf8"));
const contact = contacts.find((item) => item.id === contactId);

if (!contact) {
  console.error(`Kontakt ${contactId} nebyl nalezen v data/kontakty.csv`);
  process.exit(1);
}

await appendCsvLine(paths.replies, [nowIso(), contact.id, contact.nazev, interest, summary, nextStep, messageId]);
await appendCsvLine(paths.activity, [nowIso(), contact.id, contact.nazev, "reply_recorded", interest, `${summary} | next: ${nextStep}`, messageId]);

console.log(`Zapsána odpověď pro ${contact.id} - ${contact.nazev}`);
console.log(`Zájem: ${interest}`);
console.log(`Další krok: ${nextStep}`);
