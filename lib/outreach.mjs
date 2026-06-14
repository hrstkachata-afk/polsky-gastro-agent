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
      subject: "Gotowy przystanek dla wycieczek szkolnych w Štramberku",
      leadIn: "Widzę u Państwa temat wycieczek szkolnych do Czech, więc nie wysyłam ogólnej reklamy restauracji, tylko konkretny pomysł na jeden punkt programu.",
      fit: "Dla szkoły zrobiłabym wersję bez alkoholu: obiad z prawdziwej czeskiej kuchni, słodkie Štramberské ucho z kremem, lekki quiz i małą paczkę oryginalnych uszu na drogę.",
      proof: "Taki punkt pasuje między zwiedzanie a dalszy przejazd, bo grupa ma jedzenie, krótki lokalny akcent i nie traci dużo czasu.",
      cta: "Jeżeli mają Państwo w planach Czechy dla szkół, mogę przygotować konkretną wersję pod wiek uczniów, liczbę osób i termin."
    };
  }

  if (/(senior|65\+|emeryt|dojrzał|dojrzal|60plus|seniorka)/i.test(text)) {
    return {
      key: "senior",
      label: "seniorzy",
      subject: "Spokojny obiad i program dla grup seniorów w Štramberku",
      leadIn: "Widzę, że pracują Państwo z grupami seniorów, więc proponuję spokojny przystanek w Štramberku zamiast zwykłego postoju na obiad.",
      fit: "Dla seniorów przygotowałabym obiad bez pośpiechu z prawdziwej czeskiej kuchni, Štramberské ucho z naszym kremem, lekki quiz przy stole i paczkę uszu na drogę.",
      proof: "Całość może być spokojna i bez pośpiechu, żeby grupa nie miała poczucia kolejnej atrakcji na siłę.",
      cta: "Jeżeli planują Państwo Czechy lub Morawy dla seniorów, mogę rozpisać spokojny wariant z menu i orientacyjnym czasem pobytu."
    };
  }

  if (/(autokar|bus|przewoz|transport|wyjazdy autokarowe|wynajem autobus)/i.test(text)) {
    return {
      key: "coach",
      label: "grupy autokarowe",
      subject: "Gotowy przystanek obiadowy dla autokaru w Štramberku",
      leadIn: "Widzę, że zajmują się Państwo wyjazdami autokarowymi, dlatego proponuję gotowy postój dla grup jadących do Czech albo przez Morawy.",
      fit: "Dla autokaru najważniejsze jest, żeby wszystko było ustalone wcześniej: godzina, menu z prawdziwej czeskiej kuchni, czas obsługi i krótki program, który nie rozbije trasy.",
      proof: "Dla organizatora to ma być praktyczne: jedna konkretna godzina, ustalone menu i krótki lokalny akcent bez komplikowania przejazdu.",
      cta: "Jeżeli mają Państwo trasy przez Czechy lub Morawy, mogę rozpisać gotowy postój dla autokaru z menu i czasem obsługi."
    };
  }

  if (/(przewodnik|blog|atrakcje|zwiedzanie|co zobaczyć|co zobaczyc|poradnik|informacje)/i.test(text)) {
    return {
      key: "guide",
      label: "przewodnicy, portale i organizatorzy programu",
      subject: "Konkretny punkt programu w Štramberku dla grup z Polski",
      leadIn: "Trafiłam na Państwa materiały o Czechach i Morawach, więc piszę z czymś, co można realnie włożyć do programu grupy.",
      fit: "Chodzi o krótki przystanek w Štramberku: obiad, regionalny deser Štramberské ucho z naszym kremem, lekki quiz i paczka uszu na drogę.",
      proof: "Możemy zrobić wersję dla dorosłych, seniorów albo dzieci, więc ten sam pomysł da się dopasować do różnych grup.",
      cta: "Jeżeli układają Państwo programy dla grup, mogę przesłać gotowy opis punktu programu i warunki dla organizatora."
    };
  }

  return {
    key: "travel",
    label: "biuro podrozy",
    subject: "Gotowy punkt programu dla grup w Štramberku",
    leadIn: "Trafiłam na Państwa ofertę wyjazdów, dlatego piszę nie z ogólną reklamą, tylko z gotowym punktem programu dla grup w Štramberku.",
    fit: "Propozycja jest prosta: grupa robi wycieczkę do Štramberka, przyjeżdża na umówioną godzinę, dostaje obiad z prawdziwej czeskiej kuchni, ma krótki program i może jechać dalej.",
    proof: "Wariant możemy dopasować do dorosłych, seniorów, szkół albo firm, więc nie jest to jedna sztywna oferta dla każdego.",
    cta: "Jeżeli takie punkty programu pasują do Państwa wyjazdów, mogę przygotować konkretną propozycję z menu i warunkami dla grup."
  };
}

function mealChoices(offer) {
  return (offer.mealChoicesPl || []).map((item) => `   - ${item}`).join("\n");
}

function personalReason(lead) {
  const name = lead.nazev || "";
  if (!name) return "";
  const cleanName = name
    .replace(/\s+/g, " ")
    .replace(/&#8211;/g, "-")
    .trim();
  return `Piszę konkretnie po obejrzeniu tej strony/oferty: „${cleanName}”.`;
}

function concretePackage(offer, audience) {
  const adultExtras = audience.key === "school"
    ? "dla szkół robimy wariant dziecięcy bez alkoholu"
    : "dla dorosłych można dodać degustację lokalnego piwa Olbrew albo spróbowanie domowej śliwowicy";

  return [
    "Konkretnie mogę Państwu zaproponować taki wariant:",
    "",
    "1. Obiad dla grupy, wybrany wcześniej przez organizatora:",
    mealChoices(offer) || "- menu ustalone wcześniej dla grupy",
    "",
    "2. Po obiedzie coś regionalnego, żeby to nie był tylko zwykły postój:",
    "   - Štramberské ucho z naszym kremem: lotusowym, borówkowym albo mix według aktualnej oferty",
    "   - krótki hospodský kvíz dla grupy",
    "   - paczka oryginalnych Štramberskich uszu na drogę",
    "",
    `3. Dopasowanie do grupy: ${adultExtras}.`
  ].join("\n");
}

function trelloOfferSummary(lead, offer) {
  const audience = audienceProfile(lead);
  const menu = (offer.mealChoicesPl || []).join("; ");
  const segmentNote = {
    school: "verze pro skoly bez alkoholu, vic detsky program",
    senior: "klidnejsi tempo, obiad bez spechu, lehky kviz",
    coach: "rychly autokarovy stop, cas a menu domluvit predem",
    guide: "hotovy bod programu pro skupiny v okoli Stramberku",
    travel: "hotovy bod programu pro polske skupiny"
  }[audience.key] || "hotovy bod programu pro skupiny";

  return [
    `Segment: ${audience.label}`,
    `Uhel nabidky: ${segmentNote}`,
    `Konkretni nabidka: obidovy balicek + Stramberske ucho s kremem + kviz + balicek usi na cestu.`,
    `Menu v textu: ${menu || "doplnit menu"}`,
    audience.key === "school"
      ? "Pozor: u skol neposilat alkohol, drzet detskou verzi."
      : "Pro dospele zminit Olbrew / slivovici jen jako volitelnou ochutnavku."
  ].join("\n");
}

export function renderDraft(lead, offer) {
  const audience = audienceProfile(lead);
  const subject = audience.subject;
  const body = [
    "Dzień dobry,",
    "",
    "Nazywam się Monika Sikorová i prowadzę Chatę Dr. Hrstky w Štramberku, blisko polskiej granicy.",
    "Mamy już doświadczenie z polskimi grupami i wiemy, że taka prosta czeska kuchnia połączona z krótkim programem dobrze się u nich sprawdza.",
    "",
    audience.leadIn,
    personalReason(lead),
    "",
    audience.fit,
    "",
    concretePackage(offer, audience),
    "",
    audience.proof,
    "",
    `${audience.cta} Nie chcę wysyłać Państwu przypadkowej ulotki - lepiej przygotuję krótką propozycję według liczby osób, terminu i typu grupy.`.trim(),
    "",
    "Jeżeli nie są Państwo właściwym adresatem, proszę zignorować tę wiadomość. Nie będziemy wysyłać kolejnych wiadomości bez Państwa zainteresowania.",
    "",
    "Pozdrawiam serdecznie,",
    offer.contactName || "Monika Sikorová",
    offer.restaurantName || "Chata Dr. Hrstky",
    `tel. ${offer.phone || ""}`.trim(),
    offer.email || "",
    offer.website || ""
  ].filter((line) => line !== null && line !== undefined).join("\n");

  return { subject, body };
}

export function trelloCardDescription(lead, offer, preparedDraft = null) {
  const draft = preparedDraft || renderDraft(lead, offer);
  const aiSource = draft.source === "openai"
    ? "OpenAI AI navrh podle webu kontaktu"
    : draft.source === "gemini"
      ? "Gemini AI navrh podle webu kontaktu"
    : draft.source === "fallback"
      ? "Nahradni pravidlova verze bez AI provideru"
      : "Pravidlova verze";
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
    "## Jak vznikl email",
    "",
    `Zdroj: ${aiSource}`,
    draft.segment ? `AI segment: ${draft.segment}` : "",
    draft.reason ? `Duvod: ${draft.reason}` : "",
    "",
    "## Co agent nabizi v tomhle emailu",
    "",
    trelloOfferSummary(lead, offer),
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
