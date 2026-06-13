export function scoreFor(lead) {
  const match = String(lead.poznamka || "").match(/skóre\s+(\d+)/i);
  return match ? Number(match[1]) : 0;
}

export function domainOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function priorityFor(lead) {
  const text = `${lead.poznamka || ""} ${lead.email || ""} ${lead.formular || ""}`.toLowerCase();
  if (/skóre\s+(8|9|10|11|12)/.test(text)) return "high";
  if (lead.email || lead.formular) return "normal";
  return "low";
}

export function contactTarget(lead) {
  if (lead.email) return lead.email;
  if (lead.formular) return `formularz kontaktowy: ${lead.formular}`;
  return "DOPLNIT_KONTAKT";
}

export function fitRecommendation(lead) {
  const score = scoreFor(lead);
  const text = `${lead.nazev || ""} ${lead.typ || ""} ${lead.poznamka || ""}`.toLowerCase();
  const reasons = [];

  if (lead.email) reasons.push("ma verejny firemni e-mail");
  if (!lead.email && lead.formular) reasons.push("nema e-mail, ale ma kontaktni formular");
  if (lead.typ === "biuro_podrozy") reasons.push("vypada jako cestovni kancelar");
  if (/(senior|65\+|grup)/i.test(text)) reasons.push("ma vazbu na skupiny nebo seniory");
  if (/(czech|czechy|praga|morawy|beskidy|wycieczki|autokar)/i.test(text)) {
    reasons.push("obsahove sedi na vylety/autokary/Cesko");
  }

  const level = score >= 8 ? "Vysoka sance" : score >= 5 ? "Stredni sance" : "Nizka sance";
  return `${level}. ${reasons.length ? reasons.join("; ") : "Automat nasel jen zakladni shodu, pred odeslanim radeji zkontrolovat."}`;
}

export function renderDraft(lead, offer) {
  const packageBullets = (offer.packageBulletsPl || []).map((item) => `- ${item}`).join("\n");
  const cityPl = offer.city === "Štramberk" ? "Štramberku" : offer.city || "Štramberku";
  const subject = `Propozycja dla grup z Polski - ${offer.restaurantName || "Chata Dr. Hrstky"} w ${cityPl}`;
  const body = [
    "Dzień dobry,",
    "",
    "piszę do Państwa z krótką propozycją współpracy dla grup i klientów wyjeżdżających do Czech.",
    "",
    lead.nazev ? `Znalazłam Państwa stronę: ${lead.nazev}.` : "",
    "",
    `${offer.restaurantName || "Chata Dr. Hrstky"} znajduje się w miejscowości ${offer.city || "Štramberk"}, niedaleko polskiej granicy. Przygotowaliśmy ofertę dla grup z Polski: ${offer.offerNamePl || "czeski obiad regionalny"}.`,
    "",
    "W pakiecie:",
    packageBullets || "- tradycyjny czeski obiad dla grup",
    "",
    `Oferta może pasować dla wycieczek autokarowych, grup seniorów, szkół, firm oraz krótkich wyjazdów weekendowych. ${offer.programNotePl || ""}`.trim(),
    "",
    "Czy mogę przesłać Państwu krótką ofertę grupową z menu, ceną i warunkami rezerwacji?",
    "",
    "Jeżeli nie są Państwo właściwym adresatem, proszę zignorować tę wiadomość. Nie będziemy wysyłać kolejnych wiadomości bez Państwa zainteresowania.",
    "",
    "Pozdrawiam serdecznie,",
    offer.contactName || "Monika Sikorová",
    offer.restaurantName || "Chata Dr. Hrstky",
    `tel. ${offer.phone || ""}`.trim(),
    offer.email || "",
    offer.website || ""
  ].filter((line) => line !== "").join("\n");

  return { subject, body };
}

export function trelloCardDescription(lead, offer) {
  const draft = renderDraft(lead, offer);
  return [
    "## Kontakt",
    "",
    `Firma: ${lead.nazev || "-"}`,
    `Typ: ${lead.typ || "-"}`,
    `Mesto: ${lead.mesto || "-"}`,
    `Web: ${lead.web || "-"}`,
    `Email: ${lead.email || "-"}`,
    `Telefon: ${lead.telefon || lead.phone || "-"}`,
    `Kontaktni formular: ${lead.formular || "-"}`,
    `Cil pro odeslani: ${contactTarget(lead)}`,
    "",
    "## Doporučení",
    "",
    fitRecommendation(lead),
    "",
    "## E-mail k odeslani",
    "",
    `Komu: ${contactTarget(lead)}`,
    `Predmet: ${draft.subject}`,
    "",
    draft.body,
    "",
    "## Rychly postup",
    "",
    "- [ ] zkontrolovat, ze firma neni uplne mimo",
    "- [ ] zkopirovat predmet a text",
    "- [ ] odeslat na e-mail nebo pres formular",
    "- [ ] po odeslani presunout do Odeslano",
    "- [ ] pokud nevhodne, presunout do Neposilat",
    "",
    "## Technicka poznamka",
    "",
    `Lead domain: ${domainOf(lead.web) || "-"}`,
    lead.poznamka || ""
  ].join("\n");
}
