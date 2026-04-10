import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GuestView/1.0)' },
    signal: AbortSignal.timeout(10000)
  });
  const html = await res.text();
  return { html, text: html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  };
}

function extractInternalLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const matches = [...html.matchAll(/href=["']([^"'#?]+)["']/gi)].map(m => m[1]);
  const keywords = /properties|rentals|units|listings|accommodations|condos|condo|vacation|resort|rooms|suites|1bedroom|2bedroom|bedroom/i;
  const seen = new Set();
  const links = [];
  for (const link of matches) {
    try {
      const full = new URL(link, base).href;
      if (full.startsWith(base.origin) && full !== baseUrl && !seen.has(full) && keywords.test(full)) {
        seen.add(full);
        links.push(full);
      }
    } catch {}
  }
  return links.slice(0, 6); // max 6 subpages
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const cleanUrl = url.startsWith('http') ? url : `https://${url}`;

  try {
    let homepageHtml = '';
    let homepageText = '';

    try {
      const { html, text } = await fetchText(cleanUrl);
      homepageHtml = html;
      homepageText = text;
    } catch (e) {
      return res.status(400).json({ error: 'Could not reach that website. Check the URL and try again.' });
    }

    // Find relevant subpages and fetch them in parallel
    const subpageUrls = extractInternalLinks(homepageHtml, cleanUrl);
    const subpageResults = await Promise.allSettled(
      subpageUrls.map(u => fetchText(u))
    );

    const subpageTexts = subpageResults
      .filter(r => r.status === 'fulfilled')
      .map((r, i) => `--- PAGE: ${subpageUrls[i]} ---\n${r.value.text.substring(0, 5000)}`)
      .join('\n\n');

    const combined = [
      `--- HOMEPAGE: ${cleanUrl} ---`,
      homepageText.substring(0, 8000),
      subpageTexts
    ].join('\n\n').substring(0, 30000);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are extracting vacation rental unit information from a website. The content below includes the homepage and several subpages.

Website content:
${combined}

Extract ALL rental units/properties found across all pages. For each unit identify:
1. The building/resort name (e.g. "Pelican Beach Resort", "Waterscape", "Majestic Sun")
2. The unit name/description (e.g. "Unit 707", "2 Bedroom Suite", "1408")

Group units by building. If you find individual unit numbers or names on listing pages, include each one separately. Return ONLY valid JSON, no other text:
{
  "buildings": [
    {
      "name": "Building Name",
      "units": [
        { "name": "Unit description" }
      ]
    }
  ],
  "total": 10
}`
      }]
    });

    const text = response.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Crawl error:', err);
    return res.status(500).json({ error: 'Failed to extract units. Try again.' });
  }
}
