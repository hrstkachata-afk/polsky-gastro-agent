import { renderDraft } from "./outreach.mjs";

const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const OPENAI_URL = "https://api.openai.com/v1/responses";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSnippet(text, maxChars = 7000) {
  return String(text || "")
    .replace(/\b(cookie|cookies|rodo|privacy policy|polityka prywatności)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function outputText(response) {
  if (response.output_text) return response.output_text;
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text" && part.text)
    .map((part) => part.text)
    .join("\n");
}

function parseJson(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse(fenced || raw);
}

function geminiOutputText(response) {
  return (response.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .filter(Boolean)
    .join("\n");
}

function validateDraft(value, fallback, source) {
  const subject = String(value?.subject || "").trim();
  const body = String(value?.body || "").trim();
  const reason = String(value?.reason || "").trim();
  const segment = String(value?.segment || "").trim();

  if (subject.length < 8 || body.length < 500) {
    throw new Error("AI vratila prilis kratky navrh.");
  }

  return {
    subject: subject.slice(0, 140),
    body,
    reason: reason || "AI upravila text podle nalezeneho webu.",
    segment: segment || "neznamy",
    source,
    fallbackSubject: fallback.subject
  };
}

export async function fetchLeadContext(lead) {
  if (!lead.web) return "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(lead.web, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PolskyGastroAIAgent/0.2; +https://www.chatadrhrstky.cz)",
        Accept: "text/html,application/xhtml+xml"
      }
    });
    if (!response.ok) return "";
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return "";
    return cleanSnippet(stripHtml(await response.text()));
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt({ lead, offer, fallback, pageContext }) {
  return [
    "Napiš obchodní e-mail v polštině pro polskou cestovní kancelář, školu, senior klub, autokarového organizátora nebo turistický portál.",
    "",
    "Cíl:",
    "- e-mail má být osobnější než šablona, ale pořád profesionální a stručný",
    "- má působit jako zpráva od Moniky z Chaty Dr. Hrstky, ne jako generický newsletter",
    "- má nabídnout konkrétní bod programu v Štramberku pro skupiny z Polska",
    "- nesmí tvrdit nic, co není ve vstupních datech nebo v kontextu webu",
    "- pokud kontext webu nestačí, napiš opatrně: 'Trafiłam na Państwa stronę/ofertę'",
    "",
    "Nabídka Chaty Dr. Hrstky:",
    JSON.stringify({
      restaurantName: offer.restaurantName,
      city: offer.city,
      contactName: offer.contactName,
      phone: offer.phone,
      email: offer.email,
      website: offer.website,
      meals: offer.mealChoicesPl,
      package: offer.packageBulletsPl,
      notes: [offer.menuNotePl, offer.programNotePl].filter(Boolean)
    }, null, 2),
    "",
    "Kontakt:",
    JSON.stringify({
      name: lead.nazev,
      type: lead.typ,
      city: lead.mesto,
      website: lead.web,
      email: lead.email,
      phone: lead.telefon || lead.phone,
      notes: lead.poznamka
    }, null, 2),
    "",
    "Text nalezený na webu kontaktu:",
    pageContext || "(nepodařilo se načíst dost kontextu z webu)",
    "",
    "Současná bezpečná verze návrhu, kterou můžeš vylepšit:",
    JSON.stringify(fallback, null, 2),
    "",
    "Vrať pouze JSON bez markdownu:",
    "{",
    "  \"segment\": \"school | senior | coach | guide | travel | other\",",
    "  \"reason\": \"česky jednou větou, proč agent zvolil tento úhel nabídky\",",
    "  \"subject\": \"polský předmět e-mailu\",",
    "  \"body\": \"polský e-mail; 160-260 slov; konkrétní menu/program; žádné vymyšlené reference\"",
    "}"
  ].join("\n");
}

async function generateOpenAiDraft({ lead, offer, fallback, pageContext, apiKey, model }) {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "developer",
          content: "Jsi obchodní copywriter pro restauraci Chata Dr. Hrstky. Piš přirozeně polsky, konkrétně a pravdivě. Neodesíláš e-maily, jen připravuješ návrh ke kontrole."
        },
        {
          role: "user",
          content: buildPrompt({ lead, offer, fallback, pageContext })
        }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI API chyba ${response.status}`);
  }

  return validateDraft(parseJson(outputText(data)), fallback, "openai");
}

async function generateGeminiDraft({ lead, offer, fallback, pageContext, apiKey, model }) {
  const response = await fetch(`${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: "Jsi obchodní copywriter pro restauraci Chata Dr. Hrstky. Piš přirozeně polsky, konkrétně a pravdivě. Neodesíláš e-maily, jen připravuješ návrh ke kontrole."
          }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildPrompt({ lead, offer, fallback, pageContext })
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini API chyba ${response.status}`);
  }

  return validateDraft(parseJson(geminiOutputText(data)), fallback, "gemini");
}

export async function generateAiDraft(lead, offer, options = {}) {
  const fallback = renderDraft(lead, offer);
  const pageContext = options.pageContext ?? await fetchLeadContext(lead);
  const errors = [];

  const geminiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;
  const geminiModel = options.geminiModel || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  if (geminiKey) {
    try {
      return await generateGeminiDraft({
        lead,
        offer,
        fallback,
        pageContext,
        apiKey: geminiKey,
        model: geminiModel
      });
    } catch (error) {
      errors.push(`Gemini selhalo: ${error.message}`);
    }
  } else {
    errors.push("GEMINI_API_KEY neni nastaveny");
  }

  const openAiKey = options.openAiApiKey || options.apiKey || process.env.OPENAI_API_KEY;
  const openAiModel = options.openAiModel || options.model || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  if (openAiKey) {
    try {
      return await generateOpenAiDraft({
        lead,
        offer,
        fallback,
        pageContext,
        apiKey: openAiKey,
        model: openAiModel
      });
    } catch (error) {
      errors.push(`OpenAI selhalo: ${error.message}`);
    }
  } else {
    errors.push("OPENAI_API_KEY neni nastaveny");
  }

  return {
    ...fallback,
    reason: `${errors.join(" | ")}. Pouzita pravidlova verze.`,
    segment: "fallback",
    source: "fallback"
  };
}
