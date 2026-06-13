import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { csvEscape, parseCsv, toCsvLine } from "../lib/csv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const paths = {
  contacts: path.join(root, "data", "kontakty.csv"),
  queries: path.join(root, "data", "lead-queries.txt"),
  outDir: path.join(root, "outbox", "leads"),
  candidates: path.join(root, "outbox", "leads", "lead-candidates.csv"),
  sheetsImport: path.join(root, "outbox", "leads", "google-sheets-import.tsv")
};

const localContactHeaders = [
  "id",
  "status",
  "nazev",
  "typ",
  "mesto",
  "web",
  "email",
  "telefon",
  "formular",
  "poznamka",
  "last_action",
  "last_contacted",
  "last_reply",
  "next_step"
];

const sheetsHeaders = [
  "contact_id",
  "status",
  "company_name",
  "contact_type",
  "city",
  "country",
  "website",
  "email",
  "contact_form",
  "phone",
  "source",
  "priority",
  "language",
  "first_draft_subject",
  "last_email_sent_at",
  "last_reply_at",
  "interest_status",
  "people_count",
  "requested_date",
  "budget_or_price",
  "next_step",
  "trello_card_url",
  "gmail_thread_url",
  "notes",
  "do_not_contact"
];

const args = new Set(process.argv.slice(2));
const maxQueries = Number(readArg("--max-queries") ?? 3);
const maxResultsPerQuery = Number(readArg("--max-results") ?? 5);
const maxPages = Number(readArg("--max-pages") ?? 20);
const appendLocal = args.has("--append-local");

function readArg(name) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function domainOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function stripHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeDuckDuckGoUrl(value) {
  try {
    const url = new URL(value, "https://duckduckgo.com");
    if (url.hostname.includes("duckduckgo.com") && url.searchParams.has("uddg")) {
      return normalizeUrl(url.searchParams.get("uddg"));
    }
    return normalizeUrl(url.toString());
  } catch {
    return "";
  }
}

function extractResultUrls(html, baseUrl = "https://duckduckgo.com") {
  const urls = new Set();
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const raw = match[1].replaceAll("&amp;", "&");
    const decoded = baseUrl.includes("duckduckgo.com")
      ? decodeDuckDuckGoUrl(raw)
      : normalizeUrl(new URL(raw, baseUrl).toString());
    if (!decoded) continue;
    const host = domainOf(decoded);
    if (!host || host.includes("duckduckgo.com") || host.includes("bing.com") || host.includes("microsoft.com")) continue;
    urls.add(decoded);
  }
  return [...urls];
}

function extractEmails(text) {
  const emails = new Set();
  const cleaned = text
    .replace(/\s*\[at]\s*/gi, "@")
    .replace(/\s*\(at\)\s*/gi, "@")
    .replace(/\s+@\s+/g, "@")
    .replace(/\s*\[dot]\s*/gi, ".")
    .replace(/\s*\(dot\)\s*/gi, ".");

  for (const match of cleaned.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) {
    const email = match[0].toLowerCase().replace(/[),.;]+$/, "");
    if (email.includes("example.") || email.includes("sentry.") || email.includes("wixpress.")) continue;
    emails.add(email);
  }

  return [...emails];
}

function extractPhones(text) {
  const phones = new Set();
  for (const match of text.matchAll(/(?:\+48|\+420|0048|00420)?[\s().-]*(?:\d[\s().-]*){8,12}/g)) {
    const compact = match[0].replace(/[^\d+]/g, "");
    const digits = compact.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 13) continue;
    if (/^0+$/.test(digits)) continue;
    phones.add(match[0].replace(/\s+/g, " ").trim());
  }
  return [...phones];
}

function extractContactForm(baseUrl, html) {
  const candidates = [];
  for (const match of html.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1].replaceAll("&amp;", "&");
    const label = stripHtml(match[2]).toLowerCase();
    const combined = `${href} ${label}`.toLowerCase();
    if (!/(kontakt|contact|formularz|zapytaj|rezerw|oferta)/.test(combined)) continue;
    try {
      candidates.push(normalizeUrl(new URL(href, baseUrl).toString()));
    } catch {
      // ignore malformed links
    }
  }
  return candidates.find(Boolean) || "";
}

function extractTitle(html, fallbackUrl) {
  const title = stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const cleanTitle = title
    .replace(/\s*[|-]\s*(Kontakt|Strona główna|Home).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleanTitle || domainOf(fallbackUrl);
}

function classifyLead(text, url) {
  const haystack = `${text} ${url}`.toLowerCase();
  if (/(biuro podróży|biuro podrozy|wycieczki|autokarowe|turystyka|travel)/.test(haystack)) return "biuro_podrozy";
  if (/(klub seniora|seniorzy|uniwersytet trzeciego wieku|\butw\b)/.test(haystack)) return "klub_seniora";
  if (/(szkoła|szkola|liceum|technikum|podstawowa|wycieczki szkolne)/.test(haystack)) return "szkola";
  if (/(firmowe|integracyjne|teambuilding|event)/.test(haystack)) return "firmy_eventy";
  if (/(przewodnik|pilot wycieczek)/.test(haystack)) return "przewodnik";
  return "inny";
}

function inferCity(text, query) {
  const cities = [
    "Katowice",
    "Kraków",
    "Bielsko-Biała",
    "Cieszyn",
    "Rybnik",
    "Gliwice",
    "Żory",
    "Jastrzębie-Zdrój",
    "Opole",
    "Tychy",
    "Sosnowiec"
  ];
  const haystack = `${text} ${query}`.toLowerCase();
  return cities.find((city) => haystack.includes(city.toLowerCase())) || "";
}

function scoreLead({ email, contactForm, type, text }) {
  let score = 0;
  if (email) score += 3;
  if (/^(biuro|kontakt|info|rezerwacje|oferta|sprzedaz|office)@/.test(email)) score += 2;
  if (contactForm) score += 1;
  if (type !== "inny") score += 2;
  if (/czech|czechy|morawy|beskidy|wycieczki|grupy|autokar/i.test(text)) score += 2;
  return score;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PolskyGastroLeadFinder/0.1; +https://www.chatadrhrstky.cz)",
      Accept: "text/html,application/xhtml+xml"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return "";
  return response.text();
}

async function searchQuery(query) {
  const duckUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const duckHtml = await fetchText(duckUrl);
  const duckResults = extractResultUrls(duckHtml, "https://duckduckgo.com");
  if (duckResults.length) return duckResults.slice(0, maxResultsPerQuery);

  const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&cc=pl&setlang=pl`;
  const bingHtml = await fetchText(bingUrl);
  return extractResultUrls(bingHtml, "https://www.bing.com").slice(0, maxResultsPerQuery);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildId(index) {
  return `AUTO${String(index + 1).padStart(4, "0")}`;
}

function toLocalRow(lead, index) {
  return [
    buildId(index),
    "schvalit",
    lead.name,
    lead.type,
    lead.city,
    lead.url,
    lead.email,
    lead.phone,
    lead.contactForm,
    lead.notes,
    "",
    "",
    "",
    "zkontrolovat návrh"
  ];
}

function toSheetsRow(lead, index) {
  return [
    buildId(index),
    "novy",
    lead.name,
    lead.type,
    lead.city,
    "Polska",
    lead.url,
    lead.email,
    lead.contactForm,
    lead.phone,
    lead.source,
    lead.score >= 7 ? "high" : "normal",
    "pl",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Monika zkontroluje Gmail draft a odešle ho ručně.",
    "",
    "",
    lead.notes,
    "FALSE"
  ];
}

async function main() {
  await fs.mkdir(paths.outDir, { recursive: true });

  const [queriesRaw, contactsRaw] = await Promise.all([
    fs.readFile(paths.queries, "utf8"),
    fs.readFile(paths.contacts, "utf8").catch(() => "")
  ]);

  const existing = new Set(parseCsv(contactsRaw).map((contact) => domainOf(contact.web)).filter(Boolean));
  const queries = queriesRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .slice(0, maxQueries);

  const candidateUrls = new Map();
  for (const query of queries) {
    console.log(`Hledám: ${query}`);
    try {
      const urls = await searchQuery(query);
      for (const url of urls) {
        const domain = domainOf(url);
        if (!domain || existing.has(domain)) continue;
        if (!candidateUrls.has(domain)) candidateUrls.set(domain, { url, query });
      }
    } catch (error) {
      console.warn(`Vyhledávání selhalo pro "${query}": ${error.message}`);
    }
    await sleep(1200);
  }

  const leads = [];
  for (const { url, query } of [...candidateUrls.values()].slice(0, maxPages)) {
    const domain = domainOf(url);
    try {
      console.log(`Kontroluji: ${domain}`);
      const html = await fetchText(url);
      const text = stripHtml(html);
      const emails = extractEmails(text);
      const email = emails.find((item) => /^(biuro|kontakt|info|rezerwacje|oferta|sprzedaz|office)@/.test(item)) || emails[0] || "";
      const phone = extractPhones(text)[0] || "";
      const contactForm = extractContactForm(url, html);
      const type = classifyLead(text, url);
      const city = inferCity(text, query);
      const score = scoreLead({ email, contactForm, type, text });

      if (score < 4) continue;

      leads.push({
        name: extractTitle(html, url),
        type,
        city,
        url,
        email,
        phone,
        contactForm,
        score,
        source: `auto search: ${query}`,
        notes: `Automaticky nalezeno. Skóre ${score}. Před oslovením ručně zkontrolovat web a vhodnost kontaktu.`
      });
    } catch (error) {
      console.warn(`Kontrola selhala pro ${domain}: ${error.message}`);
    }
    await sleep(1000);
  }

  const sorted = leads.sort((a, b) => b.score - a.score);
  const localCsv = [
    localContactHeaders.join(","),
    ...sorted.map((lead, index) => toCsvLine(toLocalRow(lead, index)))
  ].join("\n");
  const sheetsTsv = [
    sheetsHeaders.join("\t"),
    ...sorted.map((lead, index) => toSheetsRow(lead, index).map((value) => String(value ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ")).join("\t"))
  ].join("\n");

  await fs.writeFile(paths.candidates, `${localCsv}\n`, "utf8");
  await fs.writeFile(paths.sheetsImport, `${sheetsTsv}\n`, "utf8");

  if (appendLocal && sorted.length) {
    const rows = sorted.map((lead, index) => toLocalRow(lead, index + Date.now()).map(csvEscape).join(",")).join("\n");
    await fs.appendFile(paths.contacts, `${rows}\n`, "utf8");
  }

  console.log(`\nHotovo. Nalezeno kandidátů: ${sorted.length}`);
  console.log(`CSV kandidáti: ${path.relative(root, paths.candidates)}`);
  console.log(`Google Sheets import: ${path.relative(root, paths.sheetsImport)}`);
  if (!sorted.length) {
    console.log("Tip: zkus zvýšit --max-queries nebo --max-results, případně doplnit konkrétnější fráze do data/lead-queries.txt.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
