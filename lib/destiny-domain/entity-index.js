const ENTITY_DEFINITIONS = Object.freeze([
  { id: "pelican_beach_resort", aliases: ["pelican beach resort", "pelican beach", "the resort"] },
  { id: "unit_707", aliases: ["unit 707", "707"] },
  { id: "unit_1006", aliases: ["unit 1006", "1006"] },
  { id: "restaurant_boshamps", aliases: ["boshamps", "boshamps seafood", "boshamps seafood and oyster house"] },
  { id: "restaurant_back_porch", aliases: ["the back porch", "back porch"] },
  { id: "restaurant_mimmos", aliases: ["mimmo's", "mimmos", "mimmo’s"] },
  { id: "restaurant_pazzo", aliases: ["pazzo", "pazzo italiano"] },
  { id: "restaurant_fat_clemenzas", aliases: ["fat clemenza's", "fat clemenzas", "fat clemenza’s"] },
  { id: "transport_destin_fort_walton_beach_airport_vps", aliases: ["vps", "destin-fort walton beach airport", "destin fort walton beach airport", "fort walton airport"] },
  { id: "transport_pensacola_international_airport_pns", aliases: ["pns", "pensacola international airport", "pensacola airport"] },
  { id: "transport_northwest_florida_beaches_international_airport_ecp", aliases: ["ecp", "northwest florida beaches international airport", "panama city airport"] },
]);

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' -]/g, " ").replace(/\s+/g, " ").trim();
}

export function entityDefinitions() {
  return ENTITY_DEFINITIONS;
}

export function resolveEntities(text, context = {}) {
  const normalized = normalize(text);
  const matched = [];
  for (const entity of ENTITY_DEFINITIONS) {
    if (entity.aliases.some(alias => normalized.includes(normalize(alias)))) matched.push(entity.id);
  }
  const focused = [...new Set(context.focusedEntityIds || context.focusedEntities || [])];
  const pronoun = /\b(?:it|that one|the first|the second|they|their)\b/i.test(text);
  const contextual = !matched.length && pronoun && focused.length === 1 ? focused : [];
  return Object.freeze({
    subjectIds: Object.freeze([...new Set([...matched, ...contextual])]),
    unresolvedMentions: Object.freeze(pronoun && !matched.length && focused.length !== 1 ? ["ambiguous_pronoun"] : []),
  });
}

export function separateSubjectAndOrigin(entityIds, text) {
  const ids = [...new Set(entityIds || [])];
  const hasResort = ids.includes("pelican_beach_resort");
  const placeSubjects = ids.filter(id => id !== "pelican_beach_resort");
  const distanceIntent = /\b(?:close|near|distance|far|minutes?|drive)\b/i.test(String(text || ""));
  return Object.freeze({
    subjectIds: Object.freeze(distanceIntent && placeSubjects.length ? placeSubjects : ids),
    originId: hasResort && distanceIntent ? "pelican_beach_resort" : null,
  });
}
