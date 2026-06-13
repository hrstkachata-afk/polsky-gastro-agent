import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, toCsvLine } from "../lib/csv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const paths = {
  leadsCsv: path.join(root, "outbox", "leads", "lead-candidates.csv"),
  outDir: path.join(root, "outbox", "review"),
  checklist: path.join(root, "outbox", "review", "kontakty-ke-kontrole.md"),
  trelloCsv: path.join(root, "outbox", "review", "trello-karty-ke-kontrole.csv")
};

function priorityFor(lead) {
  const text = `${lead.poznamka || ""} ${lead.email || ""} ${lead.formular || ""}`.toLowerCase();
  if (/skóre\s+(8|9|10|11|12)/.test(text)) return "high";
  if (lead.email || lead.formular) return "normal";
  return "low";
}

function cardDescription(lead) {
  return [
    `Firma: ${lead.nazev}`,
    `Typ: ${lead.typ || "neznamy"}`,
    `Mesto: ${lead.mesto || "nezname"}`,
    `Web: ${lead.web || "-"}`,
    `Email: ${lead.email || "-"}`,
    `Kontaktni formular: ${lead.formular || "-"}`,
    "",
    "Kontrola pred oslovenim:",
    "- [ ] firma dava smysl pro skupinovy vylet/restauraci",
    "- [ ] kontakt je obecny firemni kontakt, ne soukroma osoba",
    "- [ ] web nevypada neaktivne nebo nevhodne",
    "- [ ] po schvaleni vytvorit Gmail draft",
    "",
    lead.poznamka || ""
  ].join("\n");
}

function buildChecklist(leads) {
  const lines = [
    "# Kontakty ke kontrole",
    "",
    "Tyto kontakty jsou jen kandidati. Pred vlozenim do CRM nebo vytvorenim Gmail draftu je rucne zkontroluj.",
    ""
  ];

  for (const lead of leads) {
    lines.push(`## ${lead.nazev}`);
    lines.push("");
    lines.push(`- Typ: ${lead.typ || "-"}`);
    lines.push(`- Mesto: ${lead.mesto || "-"}`);
    lines.push(`- Priorita: ${priorityFor(lead)}`);
    lines.push(`- Web: ${lead.web || "-"}`);
    lines.push(`- Email: ${lead.email || "-"}`);
    lines.push(`- Formular: ${lead.formular || "-"}`);
    lines.push("- Schvaleni:");
    lines.push("  - [ ] vhodny kontakt");
    lines.push("  - [ ] vytvorit Gmail draft");
    lines.push("  - [ ] neposilat");
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function buildTrelloCsv(leads) {
  const headers = ["Card Name", "Description", "List Name", "Labels"];
  const rows = leads.map((lead) => [
    lead.nazev,
    cardDescription(lead),
    "Ke kontrole",
    priorityFor(lead)
  ]);
  return `${[headers, ...rows].map(toCsvLine).join("\n")}\n`;
}

async function main() {
  await fs.mkdir(paths.outDir, { recursive: true });
  const raw = await fs.readFile(paths.leadsCsv, "utf8").catch(() => "");
  const leads = parseCsv(raw).filter((lead) => lead.nazev && lead.web);

  await fs.writeFile(paths.checklist, buildChecklist(leads), "utf8");
  await fs.writeFile(paths.trelloCsv, buildTrelloCsv(leads), "utf8");

  console.log(`Review checklist: ${path.relative(root, paths.checklist)}`);
  console.log(`Trello CSV: ${path.relative(root, paths.trelloCsv)}`);
  console.log(`Kontaktu ke kontrole: ${leads.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
