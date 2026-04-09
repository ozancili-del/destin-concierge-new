import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const cleanUrl = url.startsWith('http') ? url : `https://${url}`;

  try {
    let siteContent = '';
    try {
      const fetchRes = await fetch(cleanUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GuestView/1.0)' },
        signal: AbortSignal.timeout(10000)
      });
      siteContent = await fetchRes.text();
      siteContent = siteContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                               .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                               .replace(/<[^>]+>/g, ' ')
                               .replace(/\s+/g, ' ')
                               .substring(0, 12000);
    } catch (e) {
      return res.status(400).json({ error: 'Could not reach that website. Check the URL and try again.' });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are extracting vacation rental unit information from a website.

Website content:
${siteContent}

Extract ALL rental units/properties. For each unit identify:
1. The building/resort name (e.g. "Pelican Beach Resort", "Waterscape", "Majestic Sun")
2. The unit name/description (e.g. "7th Floor", "2 Bedroom Suite")

Group units by building. Return ONLY valid JSON, no other text:
{
  "buildings": [
    {
      "name": "Building Name",
      "units": [
        { "name": "Unit description" }
      ]
    }
  ],
  "total": 27
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
