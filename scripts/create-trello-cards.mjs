import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../lib/csv.mjs";
import { domainOf, priorityFor, trelloCardDescription } from "../lib/outreach.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const paths = {
  leadsCsv: path.join(root, "outbox", "leads", "lead-candidates.csv"),
  offer: path.join(root, "data", "nabidka.json")
};

const key = process.env.TRELLO_KEY;
const token = process.env.TRELLO_TOKEN;
const listId = process.env.TRELLO_LIST_ID;
const dryRun = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");
const maxCards = Number(process.env.MAX_TRELLO_CARDS || "10");

function cardName(lead) {
  const city = lead.mesto ? ` - ${lead.mesto}` : "";
  return `[${priorityFor(lead)}] ${lead.nazev}${city}`.slice(0, 160);
}

function trelloUrl(pathname, params = {}) {
  const url = new URL(`https://api.trello.com/1${pathname}`);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(name, value);
  }
  return url;
}

async function trello(pathname, options = {}, params = {}) {
  if (!key || !token || !listId) {
    throw new Error("Chybi TRELLO_KEY, TRELLO_TOKEN nebo TRELLO_LIST_ID.");
  }

  const response = await fetch(trelloUrl(pathname, params), {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Trello API chyba ${response.status}`);
  }
  return data;
}

async function existingDomainsInList() {
  const cards = await trello(`/lists/${listId}/cards`, {}, { fields: "name,desc,closed" });
  const domains = new Set();
  for (const card of cards) {
    const match = String(card.desc || "").match(/Lead domain:\s*([^\s]+)/);
    if (match?.[1]) domains.add(match[1].trim().toLowerCase());
  }
  return domains;
}

async function createCard(lead, offer) {
  return trello("/cards", {
    method: "POST"
  }, {
    idList: listId,
    name: cardName(lead),
    desc: trelloCardDescription(lead, offer),
    pos: "bottom"
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
    .slice(0, maxCards);

  if (dryRun || !key || !token || !listId) {
    const reason = dryRun ? "DRY RUN" : "Trello neni nakonfigurovane";
    console.log(`${reason}: vytvorilo by se Trello karet: ${leads.length}`);
    for (const lead of leads) {
      console.log(`- ${cardName(lead)} (${domainOf(lead.web)})`);
    }
    return;
  }

  const existingDomains = await existingDomainsInList();
  let created = 0;
  for (const lead of leads) {
    const domain = domainOf(lead.web).toLowerCase();
    if (!domain || existingDomains.has(domain)) continue;
    const card = await createCard(lead, offer);
    existingDomains.add(domain);
    created += 1;
    console.log(`Vytvorena Trello karta: ${card.name} ${card.shortUrl || card.url || ""}`);
  }

  console.log(`Hotovo. Novych Trello karet: ${created}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
