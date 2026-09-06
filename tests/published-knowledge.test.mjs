import test from "node:test";
import assert from "node:assert/strict";
import {
  contextualizePublishedKnowledgeQuery,
  inferPublishedKnowledgeTopics,
  isBroadPublishedKnowledgeRecommendation,
  rankPublishedKnowledge,
  resetPublishedKnowledgeCacheForTests,
  searchPublishedKnowledge,
} from "../lib/destiny-agent/published-knowledge.js";

const bundle = {
  revision: "6339a434",
  manifest: { schema_version: "1.0", policy: "approved-current-conflict-free" },
  topics: [
    {
      topic_id: "amenities",
      title: "Amenities",
      entries: [{
        id: "ev_chargers",
        name: "EV chargers",
        publication_status: "approved",
        retrieval_tags: ["electric vehicle", "parking", "J1772"],
        guest_questions: ["Can I charge my EV?"],
        facts: [{ claim: "Two Level 2 J1772 chargers are on the upper parking-garage level.", publication_status: "approved" }],
        recommendation_notes: [{ text: "Guests need a compatible J1772 adapter.", publication_status: "approved" }],
        example_spoken_answers: { short: "There are two paid J1772 chargers." },
      }],
    },
    {
      topic_id: "restaurants",
      title: "Restaurants",
      entries: [{
        id: "pazzo",
        name: "Pazzo Italiano",
        publication_status: "approved",
        retrieval_tags: ["Italian", "pasta"],
        facts: [
          { claim: "Pazzo Italiano serves Italian food.", publication_status: "approved" },
          { claim: "An unapproved claim must never be retrieved.", publication_status: "draft" },
        ],
        recommendation_notes: [{ text: "Consider it for an Italian dinner.", publication_status: "approved" }],
        safe_fallback: "Check current hours before leaving.",
      }],
    },
  ],
};

test("published retrieval is disabled by default", async () => {
  resetPublishedKnowledgeCacheForTests();
  let called = false;
  const result = await searchPublishedKnowledge({
    query: "EV charger",
    env: {},
    fetchImpl: async () => { called = true; throw new Error("unexpected"); },
  });
  assert.equal(called, false);
  assert.equal(result.status, "disabled");
  assert.equal(result.source, "legacy");
});

test("published retrieval uses the approved snapshot when enabled", async () => {
  resetPublishedKnowledgeCacheForTests();
  const result = await searchPublishedKnowledge({
    query: "Do you have an EV charger?",
    topics: ["resort"],
    env: { DESTINY_PUBLISHED_KNOWLEDGE_ENABLED: "true", DESTINY_PUBLISHED_KNOWLEDGE_URL: "https://knowledge.test/bundle" },
    fetchImpl: async url => {
      const requested = new URL(url);
      assert.equal(`${requested.origin}${requested.pathname}`, "https://knowledge.test/bundle");
      assert.match(requested.searchParams.get("knowledge_window") || "", /^\d+$/);
      return { ok: true, json: async () => bundle };
    },
  });
  assert.equal(result.source, "published");
  assert.equal(result.revision, "6339a434");
  assert.match(result.snippets[0].text, /Two Level 2 J1772/);
});

test("ranking never renders draft facts", () => {
  const result = rankPublishedKnowledge(bundle, { query: "Italian dinner", topics: ["restaurants"], limit: 3 });
  assert.equal(result.snippets.length, 1);
  assert.match(result.snippets[0].text, /Pazzo Italiano serves Italian food/);
  assert.doesNotMatch(result.snippets[0].text, /unapproved claim/);
});

test("voice knowledge topic inference covers stable HQ domains without using a model", () => {
  const cases = [
    ["Where are the EV chargers?", ["amenities"]],
    ["Recommend Italian restaurants", ["restaurants"]],
    ["What is November weather usually like?", ["seasonal-weather"]],
    ["How do check-in and parking tags work?", ["arrival-and-logistics"]],
    ["Can I bring a wagon and cooler to the beach?", ["beach-and-services"]],
    ["Is the route wheelchair accessible?", ["accessibility"]],
    ["Do you provide a Pack n Play?", ["family-planning"]],
    ["What is the cancellation and deposit policy?", ["booking-and-assistance"]],
    ["Compare Unit 707 and Unit 1006", ["unit-707", "unit-1006", "condo-comparison"]],
    ["How many floors and elevators are in the building?", ["resort-and-buildings"]],
    ["Where can I buy groceries and coffee?", ["everyday-essentials"]],
    ["What should I pack and bring to Destin?", ["everyday-essentials"]],
    ["What can we do on a rainy day?", ["rainy-day-options"]],
    ["Suggest a fishing or dolphin cruise activity", ["activities"]],
    ["What festivals and live music events are there?", ["events"]],
    ["How far is the airport and do we need a rental car?", ["transport"]],
    ["Who is the owner and how do I contact Ozan?", ["identity-and-scope"]],
    ["What should a couple do for a romantic anniversary?", ["couples-and-quieter-stays"]],
    ["Suggest a day trip to 30A or Fort Walton", ["nearby-areas-and-day-trips"]],
    ["What do I do in an emergency or if I am locked out?", ["safety-and-assistance"]],
  ];
  for (const [query, expected] of cases) {
    const actual = inferPublishedKnowledgeTopics(query);
    for (const topic of expected) assert.ok(actual.includes(topic), `${query} -> ${actual.join(",")}`);
  }
});

test("strict voice retrieval excludes unrelated entries even inside selected topics", () => {
  const result = rankPublishedKnowledge(bundle, {
    query: "Italian restaurant",
    topics: inferPublishedKnowledgeTopics("Italian restaurant"),
    limit: 4,
    requireMatch: true,
  });
  assert.equal(result.snippets.length, 1);
  assert.equal(result.snippets[0].entryId, "pazzo");
});

test("ranking preserves distinct named choices for plural recommendations", () => {
  const restaurantBundle = structuredClone(bundle);
  restaurantBundle.topics[1].entries.push(...["Mimmo's", "Fat Clemenza's", "Nonna's"].map((name, index) => ({
    id: `italian_${index}`, name, publication_status: "approved", retrieval_tags: ["Italian"],
    facts: [{ claim: `${name} is an Italian restaurant.`, publication_status: "approved" }],
    recommendation_notes: [{ text: `Consider ${name} for a different Italian fit.`, publication_status: "approved" }],
  })));
  const result = rankPublishedKnowledge(restaurantBundle, { query: "Recommend Italian restaurant options", topics: ["restaurants"], limit: 5, requireMatch: true });
  assert.equal(result.snippets.length, 4);
  assert.deepEqual(new Set(result.snippets.map((item) => item.name)).size, 4);
});

test("equivalent generic recommendation phrasing does not become a required lexical match", () => {
  const restaurantBundle = structuredClone(bundle);
  restaurantBundle.topics[1].entries.push(...["Mimmo's", "Fat Clemenza's", "Nonna's"].map((name, index) => ({
    id: `generic_${index}`, name, publication_status: "approved", retrieval_tags: ["restaurant"],
    facts: [{ claim: `${name} serves guests in Destin.`, publication_status: "approved" }],
    recommendation_notes: [{ text: `Consider ${name} for its own dining fit.`, publication_status: "approved" }],
  })));
  for (const query of [
    "Give me restaurant recommendations",
    "Can you suggest some restaurants?",
    "What restaurants do you recommend?",
    "What are the best places to eat?",
    "Please give me a few good restaurant options",
  ]) {
    const topics = inferPublishedKnowledgeTopics(query);
    assert.deepEqual(topics, ["restaurants"], query);
    assert.equal(isBroadPublishedKnowledgeRecommendation(query, topics), true, query);
    const result = rankPublishedKnowledge(restaurantBundle, { query, topics, limit: 3, requireMatch: true });
    assert.equal(result.snippets.length, 3, query);
  }
});

test("generic recommendation cleanup preserves meaningful qualifiers", () => {
  const restaurantBundle = structuredClone(bundle);
  restaurantBundle.topics[1].entries.push({
    id: "seafood", name: "Seafood Place", publication_status: "approved", retrieval_tags: ["seafood"],
    facts: [{ claim: "Seafood Place serves seafood.", publication_status: "approved" }], recommendation_notes: [],
  });
  const italian = rankPublishedKnowledge(restaurantBundle, { query: "Give me Italian restaurant recommendations", topics: ["restaurants"], limit: 3, requireMatch: true });
  assert.deepEqual(italian.snippets.map(item => item.entryId), ["pazzo"]);
  const missing = rankPublishedKnowledge(restaurantBundle, { query: "Recommend vegan restaurants", topics: ["restaurants"], limit: 3, requireMatch: true });
  assert.equal(missing.snippets.length, 0, "an unsupported qualifier must not fall back to unrelated restaurants");
});

test("recommendation topic vocabulary and generic follow-ups remain aligned", () => {
  const cases = [
    ["What are the best places to eat?", "restaurants"],
    ["Suggest some things to do", "activities"],
    ["Give me shopping recommendations", "activities"],
    ["Recommend grocery stores", "everyday-essentials"],
    ["Give me spa recommendations", "couples-and-quieter-stays"],
    ["Give me beach recommendations", "nearby-areas-and-day-trips"],
    ["What airports can I use?", "transport"],
  ];
  for (const [query, expectedTopic] of cases) {
    const topics = inferPublishedKnowledgeTopics(query);
    assert.ok(topics.includes(expectedTopic), `${query} -> ${topics.join(",")}`);
    assert.equal(isBroadPublishedKnowledgeRecommendation(query, topics), true, query);
  }
  const followUp = contextualizePublishedKnowledgeQuery("What other ones?", "Recommend Italian restaurants");
  assert.match(followUp, /Italian restaurants.*other ones/i);
  assert.deepEqual(inferPublishedKnowledgeTopics(followUp), ["restaurants"]);
  const genericFollowUp = contextualizePublishedKnowledgeQuery("What other options do you have?", "Recommend restaurants");
  const genericFollowUpResult = rankPublishedKnowledge(bundle, { query: genericFollowUp, topics: inferPublishedKnowledgeTopics(genericFollowUp), limit: 3, requireMatch: true });
  assert.equal(genericFollowUpResult.snippets.length, 1);
  assert.equal(contextualizePublishedKnowledgeQuery("What other amenities are there?", "Recommend Italian restaurants"), "What other amenities are there?");
});

test("transport, spa, and requested counts route without incidental count-word bias", () => {
  assert.deepEqual(inferPublishedKnowledgeTopics("Do I need a car in Destin?"), ["transport"]);
  assert.deepEqual(inferPublishedKnowledgeTopics("Give me transportation options"), ["transport"]);
  assert.ok(inferPublishedKnowledgeTopics("Recommend three spas").includes("couples-and-quieter-stays"));
});

test("a car-need question prefers the trip guidance over a generic transport list", () => {
  const transportBundle = { topics: [{ topic_id: "transport", title: "Transport", entries: [
    { id: "transport_car_choice", name: "No car, rideshare or rental car", publication_status: "approved", retrieval_tags: ["car", "choice"], facts: [{ claim: "Choose based on the trip shape.", publication_status: "approved" }], recommendation_notes: [] },
    { id: "transport_rental_car", name: "Rental car", publication_status: "approved", retrieval_tags: ["rental car"], facts: [{ claim: "Rental cars are available.", publication_status: "approved" }], recommendation_notes: [] },
  ] }] };
  const result = rankPublishedKnowledge(transportBundle, { query: "Do I need a car in Destin?", topics: ["transport"], limit: 5, requireMatch: true });
  assert.deepEqual(result.snippets.map((item) => item.entryId), ["transport_car_choice"]);
});

test("airport category returns only the three airports in owner-defined order", () => {
  const airport = (id, name, tags = ["airport"]) => ({ id, name, publication_status: "approved", retrieval_tags: tags, facts: [{ claim: `${name} serves Destin trips.`, publication_status: "approved" }], recommendation_notes: [{ text: `Consider ${name}.`, publication_status: "approved" }] });
  const transportBundle = { topics: [{ topic_id: "transport", title: "Transport", entries: [
    airport("transport_airports", "Airports serving Destin trips"),
    airport("transport_northwest_florida_beaches_international_airport_ecp", "Northwest Florida Beaches International Airport (ECP)", ["airport", "Panama City"]),
    airport("transport_destin_fort_walton_beach_airport_vps", "Destin–Fort Walton Beach Airport (VPS)"),
    airport("transport_pensacola_international_airport_pns", "Pensacola International Airport (PNS)"),
    airport("transport_uber_and_lyft", "Uber and Lyft", ["rideshare"]),
  ] }] };
  const broad = rankPublishedKnowledge(transportBundle, { query: "What airports serve Destin?", topics: ["transport"], limit: 5, requireMatch: true });
  assert.deepEqual(broad.snippets.map(item => item.entryId), [
    "transport_destin_fort_walton_beach_airport_vps",
    "transport_pensacola_international_airport_pns",
    "transport_northwest_florida_beaches_international_airport_ecp",
  ]);
  const followUp = contextualizePublishedKnowledgeQuery("What about Pensacola?", "What airports serve Destin?");
  const pensacola = rankPublishedKnowledge(transportBundle, { query: followUp, topics: inferPublishedKnowledgeTopics(followUp), limit: 4, requireMatch: true });
  assert.deepEqual(pensacola.snippets.map(item => item.entryId), ["transport_pensacola_international_airport_pns"]);
  const panamaCity = rankPublishedKnowledge(transportBundle, { query: "Panama City airport", topics: ["transport"], limit: 4, requireMatch: true });
  assert.deepEqual(panamaCity.snippets.map(item => item.entryId), ["transport_northwest_florida_beaches_international_airport_ecp"]);
  assert.equal(contextualizePublishedKnowledgeQuery("What about the pools?", "What airports serve Destin?"), "What about the pools?");
});
