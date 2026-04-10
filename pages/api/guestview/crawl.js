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

    // --- STEP 4: Build context for Claude ---
    let combined = '';
    const homepageText = sanitize(stripHtml(homepageHtml)).substring(0, 3000);

    // Always extract homepage links as additional candidates
    const homepageLinks = getInternalLinks(homepageHtml, baseUrl);
    const allCandidates = [...new Set([...candidateUrls, ...homepageLinks])];

    if (allCandidates.length > 0) {
      // Feed ALL URLs as a list to Claude — unit numbers in URLs are the key signal
      const urlList = allCandidates.join('\n');

      // Also fetch top scored pages for extra context
      const scored = allCandidates
        .map(u => ({ url: u, score: scoreUrl(u) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      const pageResults = await Promise.allSettled(
        scored.map(({ url: u }) => fetchRaw(u, 8000).then(html => ({ url: u, text: sanitize(stripHtml(html)).substring(0, 5000) })))
      );

      const pages = pageResults
        .filter(r => r.status === 'fulfilled')
        .map(r => `--- ${r.value.url} ---\n${r.value.text}`);

      combined = sanitize([
        `--- HOMEPAGE: ${baseUrl} ---\n${homepageText}`,
        `--- ALL SITE URLS (from sitemap/nav) ---\n${urlList}`,
        ...pages
      ].join('\n\n')).substring(0, 28000);
    } else {
      combined = sanitize(`--- HOMEPAGE: ${baseUrl} ---\n${homepageText}\n\n--- HOMEPAGE LINKS ---\n${homepageLinks.join("\n")}`);
    }

    // --- STEP 6: Claude extraction with retry ---
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `You are extracting vacation rental unit information from a website.

The content below includes the homepage text, a list of ALL URLs on the site (from sitemap or navigation), and content from key listing pages.

${combined}

Your job: Extract ALL individual rental units/properties.

Rules:
- Look at BOTH the page content AND the URL list — unit numbers often appear in URLs like /pelicanbeach302/ or /unit-707/ 
- If a URL contains a unit number (e.g. pelicanbeach302, pelicanbeach1102, unit707), treat it as a unit
- Use page content to get the building/resort name and full unit name (e.g. "Beachfront Condo 302")
- List EVERY individual unit separately — not just unit types like "1 Bedroom"
- Group units by building/resort name

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
