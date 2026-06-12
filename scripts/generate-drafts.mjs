import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendCsvLine, nowIso, parseCsv } from "../lib/csv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

const paths = {
  offer: path.join(root, "data", "nabidka.json"),
  contacts: path.join(root, "data", "kontakty.csv"),
  activity: path.join(root, "data", "aktivita.csv"),
  template: path.join(root, "templates", "email-01-dotaz-na-zajem-pl.txt"),
  outbox: path.join(root, "outbox"),
  outboxIndex: path.join(root, "outbox", "index.csv")
};

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function render(template, offer, contact) {
  const packageBullets = offer.packageBulletsPl.map((item) => `- ${item}`).join("\n");
  const values = {
    ...offer,
    ...contact,
    email: offer.email,
    packageBullets
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `DOPLNIT_${key}`);
}

function contactTarget(contact) {
  if (contact.email) return contact.email;
  if (contact.formular) return `formular: ${contact.formular}`;
  return "DOPLNIT_KONTAKT";
}

async function main() {
  const [offerRaw, contactsRaw, template] = await Promise.all([
    fs.readFile(paths.offer, "utf8"),
    fs.readFile(paths.contacts, "utf8"),
    fs.readFile(paths.template, "utf8")
  ]);

  const offer = JSON.parse(offerRaw);
  const contacts = parseCsv(contactsRaw);
  const selected = contacts.filter((contact) => contact.status === "schvalit");

  console.log(`Nalezeno kontaktů ke schválení: ${selected.length}`);

  if (dryRun) {
    for (const contact of selected) {
      console.log(`- ${contact.nazev} (${contactTarget(contact)})`);
    }
    return;
  }

  await fs.mkdir(paths.outbox, { recursive: true });

  try {
    await fs.access(paths.outboxIndex);
  } catch {
    await fs.writeFile(paths.outboxIndex, "datetime,contact_id,contact_name,target,subject,file,status\n", "utf8");
  }

  for (const contact of selected) {
    const rendered = render(template, offer, contact);
    const subject = rendered.match(/^Temat:\s*(.+)$/m)?.[1] ?? "Oferta dla grup z Polski";
    const filename = `${new Date().toISOString().slice(0, 10)}-${contact.id}-${slugify(contact.nazev)}.txt`;
    const body = [
      `ID: ${contact.id}`,
      `Komu: ${contactTarget(contact)}`,
      `Firma: ${contact.nazev}`,
      `Typ: ${contact.typ}`,
      `Město: ${contact.mesto}`,
      `Web: ${contact.web}`,
      "",
      rendered
    ].join("\n");

    await fs.writeFile(path.join(paths.outbox, filename), body, "utf8");
    await appendCsvLine(paths.outboxIndex, [nowIso(), contact.id, contact.nazev, contactTarget(contact), subject, filename, "ceka_na_schvaleni"]);
    await appendCsvLine(paths.activity, [nowIso(), contact.id, contact.nazev, "draft_created", "ceka_na_schvaleni", subject, `outbox/${filename}`]);
    console.log(`Vytvořen návrh: outbox/${filename}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
