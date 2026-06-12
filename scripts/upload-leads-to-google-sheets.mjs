import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const paths = {
  sheetsImport: path.join(root, "outbox", "leads", "google-sheets-import.tsv")
};

const sheetId = process.env.GOOGLE_SHEET_ID || "1kRlaL8SDIpluta9r7q4HSqbjblGAA9GIPNv5JAUDdNQ";
const sheetRange = process.env.GOOGLE_SHEET_RANGE || "List 1!A:Y";
const providedAccessToken = process.env.GOOGLE_ACCESS_TOKEN;
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

function parseTsv(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split("\t"));
}

async function getAccessToken() {
  if (providedAccessToken) return providedAccessToken;

  if (!serviceAccountEmail || !privateKey) {
    throw new Error(
      "Chybí GOOGLE_ACCESS_TOKEN nebo dvojice GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY. Pro online zápis použij Google service account/OIDC a sdílej s ním Google Sheet."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(privateKey);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Nepodařilo se získat Google access token.");
  }

  return data.access_token;
}

async function readExistingRows(accessToken) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetRange)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Nepodařilo se přečíst Google Sheet.");
  }
  return data.values || [];
}

async function appendRows(accessToken, rows) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: rows })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Nepodařilo se zapsat do Google Sheet.");
  }
  return data;
}

function dedupeRows(headers, existingRows, candidateRows) {
  const idIndex = headers.indexOf("contact_id");
  const websiteIndex = headers.indexOf("website");
  const emailIndex = headers.indexOf("email");
  const formIndex = headers.indexOf("contact_form");

  const existingKeys = new Set();
  for (const row of existingRows.slice(1)) {
    const keys = [
      row[idIndex],
      normalizeUrl(row[websiteIndex]),
      String(row[emailIndex] || "").toLowerCase(),
      normalizeUrl(row[formIndex])
    ].filter(Boolean);
    keys.forEach((key) => existingKeys.add(key));
  }

  const seenThisRun = new Set();
  return candidateRows.filter((row) => {
    const keys = [
      row[idIndex],
      normalizeUrl(row[websiteIndex]),
      String(row[emailIndex] || "").toLowerCase(),
      normalizeUrl(row[formIndex])
    ].filter(Boolean);
    if (keys.some((key) => existingKeys.has(key) || seenThisRun.has(key))) return false;
    keys.forEach((key) => seenThisRun.add(key));
    return true;
  });
}

async function main() {
  const raw = await fs.readFile(paths.sheetsImport, "utf8");
  const [headers, ...candidateRows] = parseTsv(raw);
  if (!candidateRows.length) {
    console.log("Není co zapisovat: lead finder nenašel kandidáty.");
    return;
  }

  const accessToken = await getAccessToken();
  const existingRows = await readExistingRows(accessToken);
  const rowsToAppend = dedupeRows(headers, existingRows, candidateRows);

  if (!rowsToAppend.length) {
    console.log("Všechny nalezené leady už v Google Sheets jsou. Nic nezapisuji.");
    return;
  }

  const result = await appendRows(accessToken, rowsToAppend);
  console.log(`Zapsáno nových leadů do Google Sheets: ${rowsToAppend.length}`);
  console.log(`Rozsah: ${result.updates?.updatedRange || "neznámý"}`);
}

main().catch((error) => {
  fail(error.message);
});
