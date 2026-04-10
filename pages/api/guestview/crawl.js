import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Fetch a URL with timeout, return text
async function fetchRaw(url, timeout = 8000) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GuestView/1.0)' },
    signal: AbortSignal.timeout(timeout)
  });
  return res.text();
}

// Strip HTML tags, collapse whitespace
function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Remove invalid unicode that breaks JSON/Anthropic API
function sanitize(str) {
  return str.replace(/[\uD800-\uDFFF]/g, '').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\uD7FF\uE000-\uFFFD]/g, ' ');
}

// Extract all internal links from HTML
function getInternalLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const seen = new Set([baseUrl]);
  const links = [];
  const excluded = /blog|news|about|contact|polic|privacy|terms|faq|review|event|gallery|discount|login|signup|sitemap|feed|tag|category|author|search|cart|checkout|account|\.pdf|\.jpg|\.png/i;

  for (const [, href] of html.matchAll(/href=["']([^"'#?]+)["']/gi)) {
    try {
      const full = new URL(href, base).href;
      if (full.startsWith(base.origin) && !seen.has(full) && !excluded.test(full)) {
        seen.add(full);
        links.push(full);
      }
    } catch {}
  }
  return links;
}

// Parse sitemap XML, return all page URLs (not images/media)
function parseSitemap(xml, baseUrl) {
  const base = new URL(baseUrl);
  const urls = [];
  const excluded = /blog|news|event|gallery|feed|tag|category|author|\.jpg|\.png|\.pdf/i;
  for (const [, url] of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    const trimmed = url.trim();
    try {
      const parsed = new URL(trimmed);
      if (parsed.origin === base.origin && !excluded.test(trimmed)) {
        urls.push(trimmed);
      }
    } catch {}
  }
  return urls;
}

// Score a URL for how likely it is to contain unit listings
function scoreUrl(url) {
  if (/1bedroom|2bedroom|3bedroom|all-units|our-units|all-properties|our-properties|accommodations|vacation-rentals-by-owner/.test(url)) return 3;
  if (/properties|rentals|units|listings|condos|condo|vacation|resort|rooms|suites|bedroom|villa|cottage|cabin/.test(url)) return 2;
  if (/[0-9]{3,4}/.test(url)) return 1; // URL contains room/unit number
  return 0;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const baseUrl = url.startsWith('http') ? url : `https://${url}`;

  try {
    // --- STEP 1: Fetch homepage ---
    let homepageHtml = '';
    try {
      homepageHtml = await fetchRaw(baseUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Could not reach that website. Check the URL and try again.' });
    }

    // --- STEP 2: Try sitemap first ---
    let candidateUrls = [];
    const sitemapUrls = [`${new URL(baseUrl).origin}/sitemap.xml`, `${new URL(baseUrl).origin}/sitemap_index.xml`];

    for (const sitemapUrl of sitemapUrls) {
      try {
        const xml = await fetchRaw(sitemapUrl, 6000);
        if (xml.includes('<loc>')) {
          // If it's a sitemap index, fetch the first child sitemap too
          const childSitemaps = [...xml.matchAll(/<loc>([^<]*sitemap[^<]*)<\/loc>/gi)].map(m => m[1].trim());
          let allXml = xml;
          for (const child of childSitemaps.slice(0, 2)) {
            try {
              const childXml = await fetchRaw(child, 5000);
              allXml += childXml;
            } catch {}
          }
          candidateUrls = parseSitemap(allXml, baseUrl);
          break;
        }
      } catch {}
    }

    // --- STEP 3: Fall back to nav link extraction ---
    if (candidateUrls.length === 0) {
      candidateUrls = getInternalLinks(homepageHtml, baseUrl);
    }

    // --- STEP 4: Score and pick top pages to fetch ---
    const scored = candidateUrls
      .map(u => ({ url: u, score: scoreUrl(u) }))
      .filter(u => u.score > 0 || candidateUrls.length < 15) // if few URLs, include all
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    // --- STEP 5: Fetch top pages in parallel ---
    const pageResults = await Promise.allSettled(
      scored.map(({ url: u }) => fetchRaw(u, 8000).then(html => ({ url: u, text: sanitize(stripHtml(html)).substring(0, 6000) })))
    );

    const pages = pageResults
      .filter(r => r.status === 'fulfilled')
      .map(r => `--- ${r.value.url} ---\n${r.value.text}`);

    // Always include homepage text
    const homepageText = sanitize(stripHtml(homepageHtml)).substring(0, 4000);
    const combined = sanitize([
      `--- HOMEPAGE: ${baseUrl} ---\n${homepageText}`,
      ...pages
    ].join('\n\n')).substring(0, 28000);

    // --- STEP 6: Claude extraction with retry ---
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `You are extracting vacation rental unit information from a website. Content from multiple pages is included below.

${combined}

Extract ALL individual rental units/properties. For each unit identify:
1. The building/resort name (e.g. "Pelican Beach Resort", "Waterscape")
2. The unit name (e.g. "Beachfront Condo 302", "Unit 707", "2 Bedroom Suite")

Rules:
- Include every individual unit you find, not just unit types
- If you see "Beachfront Condo 302", "Beachfront Condo 306" etc, list each one separately
- Group by building/resort

Return ONLY valid JSON, no other text:
{
  "buildings": [
    {
      "name": "Building Name",
      "units": [
        { "name": "Unit name" }
      ]
    }
  ],
  "total": 10
}`
          }]
        });
        break;
      } catch (e) {
        if (e.status === 529 && attempt < 2) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }

    const text = response.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);

    return res.status(200).json({ success: true, data });

  } catch (err) {
    console.error('Crawl error:', err);
    return res.status(500).json({ error: 'Failed to extract units. Try again.' });
  }
}
