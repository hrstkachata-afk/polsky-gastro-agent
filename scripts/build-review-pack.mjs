import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, toCsvLine } from "../lib/csv.mjs";
import { priorityFor, renderDraft, trelloCardDescription } from "../lib/outreach.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const paths = {
  leadsCsv: path.join(root, "outbox", "leads", "lead-candidates.csv"),
  offer: path.join(root, "data", "nabidka.json"),
  outDir: path.join(root, "outbox", "review"),
  checklist: path.join(root, "outbox", "review", "kontakty-ke-kontrole.md"),
  trelloCsv: path.join(root, "outbox", "review", "trello-karty-k-odeslani.csv")
};

function buildChecklist(leads, offer) {
  const lines = [
    "# Kontakty k odeslani",
    "",
    "Agent pripravil kontakt, cil odeslani a navrh e-mailu. Pred odeslanim staci rychle zkontrolovat, ze firma neni uplne mimo.",
    ""
  ];

  for (const lead of leads) {
    const draft = renderDraft(lead, offer);
    lines.push(`## ${lead.nazev}`);
    lines.push("");
    lines.push(`- Typ: ${lead.typ || "-"}`);
    lines.push(`- Mesto: ${lead.mesto || "-"}`);
    lines.push(`- Priorita: ${priorityFor(lead)}`);
    lines.push(`- Web: ${lead.web || "-"}`);
    lines.push(`- Email: ${lead.email || "-"}`);
    lines.push(`- Telefon: ${lead.telefon || lead.phone || "-"}`);
    lines.push(`- Formular: ${lead.formular || "-"}`);
    lines.push(`- Predmet: ${draft.subject}`);
    lines.push("- Stav:");
    lines.push("  - [ ] odeslat");
    lines.push("  - [ ] odeslano");
    lines.push("  - [ ] neposilat");
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function buildTrelloCsv(leads, offer) {
  const headers = ["Card Name", "Description", "List Name", "Labels"];
  const rows = leads.map((lead) => [
    lead.nazev,
    trelloCardDescription(lead, offer),
    "K odeslani",
    `lead,${priorityFor(lead)}`
  ]);
  return `${[headers, ...rows].map(toCsvLine).join("\n")}\n`;
}

async function main() {
  await fs.mkdir(paths.outDir, { recursive: true });
  const [raw, offerRaw] = await Promise.all([
    fs.readFile(paths.leadsCsv, "utf8").catch(() => ""),
    fs.readFile(paths.offer, "utf8")
  ]);
  const offer = JSON.parse(offerRaw);
  const leads = parseCsv(raw).filter((lead) => lead.nazev && lead.web);

  await fs.writeFile(paths.checklist, buildChecklist(leads, offer), "utf8");
  await fs.writeFile(paths.trelloCsv, buildTrelloCsv(leads, offer), "utf8");

  console.log(`Checklist k odeslani: ${path.relative(root, paths.checklist)}`);
  console.log(`Trello CSV k odeslani: ${path.relative(root, paths.trelloCsv)}`);
  console.log(`Kontaktu k odeslani: ${leads.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
