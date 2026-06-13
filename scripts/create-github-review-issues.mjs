import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../lib/csv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const paths = {
  leadsCsv: path.join(root, "outbox", "leads", "lead-candidates.csv")
};

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const dryRun = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");
const maxIssues = Number(process.env.MAX_REVIEW_ISSUES || "10");

function domainOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function priorityFor(lead) {
  const text = `${lead.poznamka || ""} ${lead.email || ""} ${lead.formular || ""}`.toLowerCase();
  if (/skóre\s+(8|9|10|11|12)/.test(text)) return "high";
  if (lead.email || lead.formular) return "normal";
  return "low";
}

function issueTitle(lead) {
  const city = lead.mesto ? ` - ${lead.mesto}` : "";
  return `[Ke kontrole] ${lead.nazev}${city}`;
}

function issueBody(lead) {
  const domain = domainOf(lead.web);
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
    `- Kontaktni formular: ${lead.formular || "-"}`,
    `- Priorita: ${priorityFor(lead)}`,
    "",
    "## Kontrola",
    "",
    "- [ ] firma dava smysl pro skupinovy vylet/restauraci",
    "- [ ] kontakt je obecny firemni kontakt, ne soukroma osoba",
    "- [ ] web nevypada neaktivne nebo nevhodne",
    "- [ ] po schvaleni pripravit e-mail draft mimo Google",
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

async function listExistingReviewDomains() {
  const issues = await github("/issues?state=all&labels=lead-review&per_page=100");
  const domains = new Set();
  for (const issue of issues) {
    const match = String(issue.body || "").match(/Lead domain:\s*([^\s]+)/);
    if (match?.[1]) domains.add(match[1].trim().toLowerCase());
  }
  return domains;
}

async function createIssue(lead) {
  const priority = priorityFor(lead);
  return github("/issues", {
    method: "POST",
    body: JSON.stringify({
      title: issueTitle(lead),
      body: issueBody(lead),
      labels: ["lead-review", `priority-${priority}`]
    })
  });
}

async function main() {
  const raw = await fs.readFile(paths.leadsCsv, "utf8").catch(() => "");
  const leads = parseCsv(raw)
    .filter((lead) => lead.nazev && lead.web)
    .slice(0, maxIssues);

  if (dryRun) {
    console.log(`DRY RUN: vytvorilo by se issues: ${leads.length}`);
    for (const lead of leads) console.log(`- ${issueTitle(lead)} (${domainOf(lead.web)})`);
    return;
  }

  await ensureLabel("lead-review", "0969da", "Kontakt nalezeny agentem a cekajici na rucni kontrolu.");
  await ensureLabel("priority-high", "d1242f", "Vysoka priorita.");
  await ensureLabel("priority-normal", "fbca04", "Normalni priorita.");
  await ensureLabel("priority-low", "8c959f", "Nizka priorita.");

  const existingDomains = await listExistingReviewDomains();
  let created = 0;
  for (const lead of leads) {
    const domain = domainOf(lead.web).toLowerCase();
    if (!domain || existingDomains.has(domain)) continue;
    const issue = await createIssue(lead);
    existingDomains.add(domain);
    created += 1;
    console.log(`Vytvoreno issue #${issue.number}: ${issue.title}`);
  }

  console.log(`Hotovo. Novych GitHub issues: ${created}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
