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
  const audience = audienceProfile(lead);
  const reasons = [];

  if (lead.email) reasons.push("ma verejny firemni e-mail");
  if (!lead.email && lead.formular) reasons.push("nema e-mail, ale ma kontaktni formular");
  if (lead.typ === "biuro_podrozy") reasons.push("vypada jako cestovni kancelar");
  if (audience.key !== "travel") reasons.push(`agent rozpoznal segment: ${audience.label}`);
  if (/(senior|65\+|grup)/i.test(text)) reasons.push("ma vazbu na skupiny nebo seniory");
  if (/(czech|czechy|praga|morawy|beskidy|wycieczki|autokar)/i.test(text)) {
    reasons.push("obsahove sedi na vylety/autokary/Cesko");
  }

  const level = score >= 8 ? "Vysoka sance" : score >= 5 ? "Stredni sance" : "Nizka sance";
  return `${level}. ${reasons.length ? reasons.join("; ") : "Automat nasel jen zakladni shodu, pred odeslanim radeji zkontrolovat."}`;
}

export function audienceProfile(lead) {
  const text = `${lead.nazev || ""} ${lead.typ || ""} ${lead.web || ""} ${lead.poznamka || ""}`.toLowerCase();

  if (/(szkol|szkoł|uczni|klas|edukacyj|kolonie|obozy|młodzież|mlodziez|dzieci)/i.test(text)) {
    return {
      key: "school",
      label: "szkoly i wycieczki edukacyjne",
      subject: "Propozycja dla wycieczek szkolnych do Czech",
      opening: "piszę z propozycją przystanku obiadowego i krótkiego programu dla grup szkolnych podróżujących do Czech.",
      context: "Znalazłam Państwa ofertę wycieczek szkolnych i pomyślałam, że nasz obiekt może być wygodnym punktem programu podczas wyjazdu do Czech.",
      angle: "Dla szkół przygotujemy wariant bez alkoholu: obiad, degustacyjne Štramberské ucho z kremem, lekki quiz oraz paczkę Štramberskich uszu na drogę.",
      cta: "Czy mogę przygotować krótką propozycję dla grup szkolnych z menu, programem i warunkami rezerwacji?"
    };
  }

  if (/(senior|65\+|emeryt|dojrzał|dojrzal|60plus|seniorka)/i.test(text)) {
    return {
      key: "senior",
      label: "seniorzy",
      subject: "Propozycja obiadu i lekkiego programu dla grup seniorów",
      opening: "piszę z propozycją spokojnego przystanku obiadowego i krótkiego programu dla grup seniorów jadących do Czech.",
      context: "Znalazłam Państwa ofertę wyjazdów dla seniorów i pomyślałam, że Štramberk może być dobrym, niedalekim punktem programu.",
      angle: "Program możemy poprowadzić spokojnie: regionalny obiad, deser Štramberské ucho z naszym kremem, lekki hospodský kvíz i paczka uszu na drogę. Dla dorosłych możliwa jest degustacja lokalnego piwa Olbrew albo domowej śliwowicy.",
      cta: "Czy mogę przesłać propozycję dla grup seniorów z menu i orientacyjnym programem?"
    };
  }

  if (/(autokar|bus|przewoz|transport|wyjazdy autokarowe|wynajem autobus)/i.test(text)) {
    return {
      key: "coach",
      label: "grupy autokarowe",
      subject: "Przystanek obiadowy dla grup autokarowych w Štramberku",
      opening: "piszę z propozycją sprawnego przystanku obiadowego dla grup autokarowych jadących do Czech lub przez Morawy.",
      context: "Znalazłam Państwa ofertę wyjazdów autokarowych i pomyślałam, że nasza restauracja może dobrze pasować jako punkt programu na trasie.",
      angle: "Dla grupy możemy wcześniej ustalić menu, przygotować obiad o konkretnej godzinie, dodać krótki quiz i paczkę Štramberskich uszu na drogę.",
      cta: "Czy mogę przygotować krótką ofertę dla grup autokarowych z menu i organizacją postoju?"
    };
  }

  if (/(przewodnik|blog|atrakcje|zwiedzanie|co zobaczyć|co zobaczyc|poradnik|informacje)/i.test(text)) {
    return {
      key: "guide",
      label: "przewodnicy, portale i organizatorzy programu",
      subject: "Pomysł na punkt programu w Štramberku dla grup z Polski",
      opening: "piszę z propozycją ciekawego punktu programu w Štramberku dla grup z Polski.",
      context: "Znalazłam Państwa materiały o Czechach, Morawach lub atrakcjach turystycznych i pomyślałam, że nasza oferta może być przydatna przy planowaniu tras.",
      angle: "Łączymy regionalny obiad, degustacyjne Štramberské ucho z kremem, lekki hospodský kvíz i paczkę uszu na drogę. Program można dopasować do dorosłych, seniorów albo dzieci.",
      cta: "Czy mogę przesłać krótki opis oferty, który można wykorzystać przy planowaniu programu dla grup?"
    };
  }

  return {
    key: "travel",
    label: "biuro podrozy",
    subject: "Propozycja dla grup z Polski - obiad i program w Štramberku",
    opening: "piszę z krótką propozycją współpracy dla grup i klientów wyjeżdżających do Czech.",
    context: "Znalazłam Państwa stronę i pomyślałam, że nasza oferta może pasować jako element programu wycieczki do Czech lub na Morawy.",
    angle: "Możemy przygotować regionalny obiad, krótki program i drobny upominek na drogę, a wariant dopasować do dorosłych, seniorów, szkół albo firm.",
    cta: "Czy mogę przesłać Państwu krótką ofertę grupową z menu, programem i warunkami rezerwacji?"
  };
}

function mealChoices(offer) {
  return (offer.mealChoicesPl || []).map((item) => `- ${item}`).join("\n");
}

export function renderDraft(lead, offer) {
  const audience = audienceProfile(lead);
  const cityPl = offer.city === "Štramberk" ? "Štramberku" : offer.city || "Štramberku";
  const subject = audience.subject;
  const body = [
    "Dzień dobry,",
    "",
    audience.opening,
    "",
    lead.nazev ? `${audience.context} Konkretnie trafiłam na: ${lead.nazev}.` : audience.context,
    "",
    `${offer.restaurantName || "Chata Dr. Hrstky"} znajduje się w ${cityPl}, niedaleko polskiej granicy. Dla grup przygotowujemy pakiet: ${offer.offerNamePl || "regionalny obiad i krótki program"}.`,
    "",
    "Menu obiadowe grupa może wybrać wcześniej, np.:",
    mealChoices(offer) || "- regionalny obiad dla grupy według wcześniejszego zamówienia",
    "",
    "Do tego możemy dodać:",
    (offer.packageBulletsPl || []).map((item) => `- ${item}`).join("\n"),
    "",
    audience.angle,
    "",
    `${audience.cta} ${offer.programNotePl || ""}`.trim(),
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
    `Rozpoznany segment: ${audienceProfile(lead).label}`,
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
