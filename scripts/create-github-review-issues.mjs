import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../lib/csv.mjs";
import { contactTarget, domainOf, fitRecommendation, priorityFor, renderDraft } from "../lib/outreach.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const paths = {
  leadsCsv: path.join(root, "outbox", "leads", "lead-candidates.csv"),
  offer: path.join(root, "data", "nabidka.json")
};

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const dryRun = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");
const maxIssues = Number(process.env.MAX_REVIEW_ISSUES || "10");

function issueTitle(lead) {
  const city = lead.mesto ? ` - ${lead.mesto}` : "";
  return `[Ke kontrole] ${lead.nazev}${city}`;
}

function issueBody(lead, offer) {
  const domain = domainOf(lead.web);
  const draft = renderDraft(lead, offer);
  return [
    "## Kontakt ke kontrole",
    "",
    `Lead domain: ${domain}`,
    "",
    `- Firma: ${lead.nazev || "-"}`,
    `- Typ: ${lead.typ || "-"}`,
    `- Mesto: ${lead.mesto || "-"}`,
    `- Web: ${lead.web || "-"}`,
    `- Email: ${lead.email || "-"}`,
    `- Telefon: ${lead.telefon || lead.phone || "-"}`,
    `- Kontaktni formular: ${lead.formular || "-"}`,
    `- Priorita: ${priorityFor(lead)}`,
    `- Cil pro odeslani: ${contactTarget(lead)}`,
    "",
    "## Automatické doporučení",
    "",
    fitRecommendation(lead),
    "",
    "## Hotový návrh e-mailu",
    "",
    `Komu: ${contactTarget(lead)}`,
    `Předmět: ${draft.subject}`,
    "",
    "```text",
    draft.body,
    "```",
    "",
    "## Kontrola",
    "",
    "- [ ] rychle zkontrolovat, že firma není úplně mimo",
    "- [ ] pokud je kontakt vhodný, zkopírovat návrh e-mailu a odeslat mimo Google",
    "- [ ] pokud je jen formulář, vložit text do formuláře",
    "- [ ] pokud nevhodne, zavrit jako `neposilat`",
    "",
    "## Poznamka",
    "",
    lead.poznamka || "-"
  ].join("\n");
}

async function github(pathname, options = {}) {
  if (!token || !repository) {
    throw new Error("Chybi GITHUB_TOKEN nebo GITHUB_REPOSITORY.");
  }

  const response = await fetch(`https://api.github.com/repos/${repository}${pathname}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });

  if (response.status === 204) return {};
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `GitHub API chyba ${response.status}`);
  }
  return data;
}

async function ensureLabel(name, color, description) {
  try {
    await github(`/labels/${encodeURIComponent(name)}`);
  } catch {
    await github("/labels", {
      method: "POST",
      body: JSON.stringify({ name, color, description })
    });
  }
}

async function listExistingReviewIssuesByDomain() {
  const issues = await github("/issues?state=all&labels=lead-review&per_page=100");
  const issuesByDomain = new Map();
  for (const issue of issues) {
    const match = String(issue.body || "").match(/Lead domain:\s*([^\s]+)/);
    if (match?.[1]) issuesByDomain.set(match[1].trim().toLowerCase(), issue);
  }
  return issuesByDomain;
}

async function addLabels(issueNumber, labels) {
  return github(`/issues/${issueNumber}/labels`, {
    method: "POST",
    body: JSON.stringify({ labels })
  });
}

async function createIssue(lead, offer) {
  const priority = priorityFor(lead);
  return github("/issues", {
    method: "POST",
    body: JSON.stringify({
      title: issueTitle(lead),
      body: issueBody(lead, offer),
      labels: ["lead-review", "draft-ready", `priority-${priority}`]
    })
  });
}

async function main() {
  const [raw, offerRaw] = await Promise.all([
    fs.readFile(paths.leadsCsv, "utf8").catch(() => ""),
    fs.readFile(paths.offer, "utf8")
  ]);
  const offer = JSON.parse(offerRaw);
  const leads = parseCsv(raw)
    .filter((lead) => lead.nazev && lead.web)
    .slice(0, maxIssues);

  if (dryRun) {
    console.log(`DRY RUN: zpracovalo by se issues: ${leads.length}`);
    for (const lead of leads) {
      const draft = renderDraft(lead, offer);
      console.log(`- ${issueTitle(lead)} (${domainOf(lead.web)})`);
      console.log(`  Komu: ${contactTarget(lead)}`);
      console.log(`  Predmet: ${draft.subject}`);
      console.log(`  Doporučení: ${fitRecommendation(lead)}`);
    }
    return;
  }

  await ensureLabel("lead-review", "0969da", "Kontakt nalezeny agentem a cekajici na rucni kontrolu.");
  await ensureLabel("draft-ready", "2da44e", "Issue obsahuje pripraveny navrh oslovení.");
  await ensureLabel("priority-high", "d1242f", "Vysoka priorita.");
  await ensureLabel("priority-normal", "fbca04", "Normalni priorita.");
  await ensureLabel("priority-low", "8c959f", "Nizka priorita.");

  const existingIssues = await listExistingReviewIssuesByDomain();
  let created = 0;
  let updated = 0;
  for (const lead of leads) {
    const domain = domainOf(lead.web).toLowerCase();
    if (!domain) continue;

    const existing = existingIssues.get(domain);
    if (existing) {
      const nextBody = issueBody(lead, offer);
      if (String(existing.body || "") !== nextBody) {
        await github(`/issues/${existing.number}`, {
          method: "PATCH",
          body: JSON.stringify({ body: nextBody })
        });
        updated += 1;
        console.log(`Aktualizovano issue #${existing.number}: ${existing.title}`);
      }
      await addLabels(existing.number, ["draft-ready"]);
      continue;
    }

    const issue = await createIssue(lead, offer);
    existingIssues.set(domain, issue);
    created += 1;
    console.log(`Vytvoreno issue #${issue.number}: ${issue.title}`);
  }

  console.log(`Hotovo. Novych GitHub issues: ${created}. Aktualizovanych issues: ${updated}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
