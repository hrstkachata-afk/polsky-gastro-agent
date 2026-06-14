import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../lib/csv.mjs";
import { generateAiDraft } from "../lib/ai-outreach.mjs";
import { domainOf, priorityFor, renderDraft, trelloCardDescription } from "../lib/outreach.mjs";

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
const useOpenAi = process.env.USE_OPENAI === "1" || process.argv.includes("--openai");
const skipExistingAiCards = process.env.SKIP_EXISTING_AI_CARDS === "1" || process.argv.includes("--skip-existing-ai");

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
  const cardsByDomain = new Map();
  for (const card of cards) {
    const match = String(card.desc || "").match(/Lead domain:\s*([^\s]+)/);
    if (match?.[1]) cardsByDomain.set(match[1].trim().toLowerCase(), card);
  }
  return cardsByDomain;
}

async function prepareDraft(lead, offer) {
  if (!useOpenAi) return null;
  try {
    const draft = await generateAiDraft(lead, offer);
    console.log(`AI navrh hotovy: ${lead.nazev} (${draft.segment || "bez segmentu"})`);
    return draft;
  } catch (error) {
    console.warn(`AI navrh selhal pro ${lead.nazev}: ${error.message}. Pouzije se pravidlova verze.`);
    return {
      ...renderDraft(lead, offer),
      source: "fallback",
      segment: "fallback",
      reason: `OpenAI selhalo: ${error.message}. Pouzita pravidlova verze.`
    };
  }
}

function hasAiDraft(card) {
  return /Zdroj:\s+(Gemini|OpenAI) AI navrh podle webu kontaktu/i.test(String(card.desc || ""));
}

function isQuotaFallback(draft) {
  return draft?.source === "fallback" && /(quota|rate|limit|exceeded)/i.test(String(draft.reason || ""));
}

async function createCard(lead, offer, draft) {
  return trello("/cards", {
    method: "POST"
  }, {
    idList: listId,
    name: cardName(lead),
    desc: trelloCardDescription(lead, offer, draft),
    pos: "bottom"
  });
}

async function updateCard(card, lead, offer, draft) {
  return trello(`/cards/${card.id}`, {
    method: "PUT"
  }, {
    name: cardName(lead),
    desc: trelloCardDescription(lead, offer, draft)
  });
}

async function main() {
  const [raw, offerRaw] = await Promise.all([
    fs.readFile(paths.leadsCsv, "utf8").catch(() => ""),
    fs.readFile(paths.offer, "utf8")
  ]);
  const offer = JSON.parse(offerRaw);
  const leads = parseCsv(raw)
    .filter((lead) => lead.nazev && lead.web);

  if (dryRun || !key || !token || !listId) {
    const previewLeads = leads.slice(0, maxCards);
    const reason = dryRun ? "DRY RUN" : "Trello neni nakonfigurovane";
    console.log(`${reason}: zpracovalo by se Trello karet: ${previewLeads.length}`);
    for (const lead of previewLeads) {
      console.log(`- ${cardName(lead)} (${domainOf(lead.web)})`);
    }
    return;
  }

  const existingCards = await existingDomainsInList();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let processed = 0;
  for (const lead of leads) {
    if (processed >= maxCards) break;
    const domain = domainOf(lead.web).toLowerCase();
    if (!domain) continue;
    const existingCard = existingCards.get(domain);
    if (existingCard && skipExistingAiCards && hasAiDraft(existingCard)) {
      skipped += 1;
      console.log(`Preskocena Trello karta, uz ma AI text: ${cardName(lead)} ${existingCard.shortUrl || ""}`);
      continue;
    }

    processed += 1;
    const draft = await prepareDraft(lead, offer);
    if (existingCard) {
      if (hasAiDraft(existingCard) && isQuotaFallback(draft)) {
        console.log(`Preskocena Trello karta kvuli AI limitu, zachovan starsi AI text: ${cardName(lead)} ${existingCard.shortUrl || ""}`);
        continue;
      }
      await updateCard(existingCard, lead, offer, draft);
      updated += 1;
      console.log(`Aktualizovana Trello karta: ${cardName(lead)} ${existingCard.shortUrl || ""}`);
      continue;
    }
    const card = await createCard(lead, offer, draft);
    existingCards.set(domain, card);
    created += 1;
    console.log(`Vytvorena Trello karta: ${card.name} ${card.shortUrl || card.url || ""}`);
  }

  console.log(`Hotovo. Novych Trello karet: ${created}. Aktualizovanych Trello karet: ${updated}. Preskocenych hotovych AI karet: ${skipped}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
