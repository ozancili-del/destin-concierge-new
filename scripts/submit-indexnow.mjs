const SITE = "https://www.destincondogetaways.com";
const HOST = "www.destincondogetaways.com";
const KEY = "98d50ec6757c4a1fb829b6343eae2f01";
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

function extractLocations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

async function requireOk(url, label) {
  const response = await fetch(url, { redirect: "manual" });
  if (response.status !== 200) {
    throw new Error(`${label} must return 200 without redirect: ${url} returned ${response.status}`);
  }
  return response;
}

const keyResponse = await requireOk(KEY_LOCATION, "IndexNow key file");
if ((await keyResponse.text()).trim() !== KEY) {
  throw new Error("The live IndexNow key file does not contain the expected key.");
}

const sitemapResponse = await requireOk(`${SITE}/sitemap.xml`, "Canonical sitemap");
const urls = extractLocations(await sitemapResponse.text());

if (!urls.length) throw new Error("No URLs were found in the live sitemap.");
if (new Set(urls).size !== urls.length) throw new Error("The live sitemap contains duplicate URLs.");

for (const value of urls) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== HOST || url.search || url.hash) {
    throw new Error(`Refusing non-canonical IndexNow URL: ${value}`);
  }
  await requireOk(value, "Canonical sitemap URL");
}

const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  }),
});

if (![200, 202].includes(response.status)) {
  throw new Error(`IndexNow rejected the submission with ${response.status}: ${await response.text()}`);
}

console.log(`IndexNow accepted ${urls.length} canonical URLs (${response.status}).`);
