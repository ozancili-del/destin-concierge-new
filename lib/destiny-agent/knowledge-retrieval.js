import { KNOWLEDGE_BASE } from "./knowledge-v1.js";

const SECTION_ALIASES = Object.freeze({
  properties: ["PROPERTIES"],
  resort: ["RESORT FACILITIES", "RESORT MAP"],
  checkin: ["CHECK-IN & CHECK-OUT"],
  appliances: ["APPLIANCE & UNIT RULES"],
  policies: ["POLICIES"],
  owner: ["ABOUT OZAN & THE PROPERTY"],
  booking: ["BOOKING & PAYMENTS"],
  contacts: ["CONTACTS"],
  tv: ["COX CABLE TV SETUP"],
  local: ["LOCAL TIPS"],
  blogs: ["INTERACTIVE TOOLS ON OUR BLOGS"],
  weather: ["DESTINY BLUE'S TONE & RULES"],
  family_safety: ["DESTINY BLUE'S TONE & RULES"],
  maintenance: ["DESTINY BLUE'S TONE & RULES"],
});

export const KNOWLEDGE_TOPICS = Object.freeze(Object.keys(SECTION_ALIASES));

function normalizeHeading(value) {
  return String(value || "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[^A-Z0-9 &'/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSections() {
  const lines = String(KNOWLEDGE_BASE || "").split(/\r?\n/);
  const sections = [];
  let current = { heading: "GENERAL", lines: [] };
  const divider = /^━{5,}$/;

  for (let i = 0; i < lines.length; i += 1) {
    if (divider.test(lines[i] || "") && i + 2 < lines.length && divider.test(lines[i + 2] || "")) {
      if (current.lines.length) sections.push(current);
      current = { heading: normalizeHeading(lines[i + 1]), lines: [] };
      i += 2;
      continue;
    }
    current.lines.push(lines[i]);
  }
  if (current.lines.length) sections.push(current);
  return sections.map(section => ({ ...section, text: section.lines.join("\n").trim() })).filter(section => section.text);
}

const SECTIONS = parseSections();
const URL_RE = /https?:\/\/[^\s)\]>'"]+/g;
const WORD_RE = /[a-z0-9]{3,}/g;
const STOP = new Set(["the","and","for","with","that","this","from","your","you","are","our","have","has","what","when","where","which","does","can","will","about","into","only","guest","guests","destin"]);

function terms(text) {
  const raw = (String(text || "").toLowerCase().match(WORD_RE) || []).filter(word => !STOP.has(word));
  const expanded = new Set(raw);
  const synonyms = {
    dog: ["pet", "pets"], dogs: ["pet", "pets"], cat: ["pet", "pets"], cats: ["pet", "pets"], animal: ["pet", "pets"],
    smoke: ["smoking"], smoking: ["smoke"], vape: ["smoking", "vaping"], vaping: ["smoking", "vape"],
    kid: ["child", "children"], kids: ["child", "children"], toddler: ["child", "children"], baby: ["child", "children", "infant"],
    washer: ["laundry"], dryer: ["laundry"], wifi: ["internet"], internet: ["wifi"],
  };
  for (const word of raw) for (const synonym of synonyms[word] || []) expanded.add(synonym);
  return expanded;
}

function splitParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n|(?=^[A-Z][A-Z /&'()-]{4,}:?$)/m)
    .map(value => value.trim())
    .filter(Boolean);
}

function topicSections(topics) {
  if (!Array.isArray(topics) || !topics.length) return SECTIONS;
  const requested = new Set();
  for (const topic of topics) {
    for (const heading of SECTION_ALIASES[topic] || []) requested.add(normalizeHeading(heading));
  }
  return SECTIONS.filter(section => [...requested].some(heading => section.heading.startsWith(heading)));
}

function isObsoleteControlText(text) {
  return /INTENT:\s*\[category\]|Always include the INTENT line|CRITICAL:\s*Always include the INTENT|INTENT CLASSIFICATION/i.test(text);
}

export function searchBusinessKnowledge({ query = "", topics = [], limit = 8 } = {}) {
  const qTerms = terms(query);
  const candidates = [];
  for (const section of topicSections(topics)) {
    for (const paragraph of splitParagraphs(section.text)) {
      if (isObsoleteControlText(paragraph)) continue;
      const pTerms = terms(paragraph);
      let score = 0;
      for (const term of qTerms) if (pTerms.has(term)) score += 3;
      if (topics?.length) score += 2;
      if (/^(PETS|SMOKING|AGE|MAX GUESTS|HOA|PAYMENTS|CANCELLATION|CHECK-IN|CHECK-OUT|AC RULES|FRIDGE WARNING|DOOR LOCK|AIRPORTS|CAR RENTAL|CHILD|TODDLER|SPECIAL OCCASIONS)/i.test(paragraph)) score += 1;
      candidates.push({ section: section.heading, paragraph, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.paragraph.length - b.paragraph.length);
  const selected = candidates
    .filter((item, index) => item.score > 0 || index < Math.min(3, candidates.length))
    .slice(0, Math.max(1, Math.min(Number(limit) || 8, 12)));
  const snippets = selected.map(item => ({ section: item.section, text: item.paragraph.slice(0, 2200) }));
  const urls = [...new Set(snippets.flatMap(item => item.text.match(URL_RE) || []).map(url => url.replace(/[.,!?;:]+$/, "")))];
  return { query, topics, snippets, urls };
}

export function listKnowledgeSections() {
  return SECTIONS.map(section => section.heading);
}
