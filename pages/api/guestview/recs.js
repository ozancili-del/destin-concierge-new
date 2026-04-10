import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { building, guestName, weather, timeSlot, sunset, windSpeed, temp, dayOfWeek } = req.body;

  const name = guestName || 'Guest';
  const loc = building || 'Destin, Florida';
  const dw = dayOfWeek || new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Chicago' });
  const th = temp || weather?.[0]?.high || 78;
  const ss = sunset || 'around 7:30pm';
  const ws = windSpeed || 0;

  const prompt = `You are a warm vacation rental concierge for ${loc}, Destin FL. Guest: ${name}. Today: ${dw}. Weather: ${th}F high. Sunset: ${ss}. Wind: ${ws} mph.

Respond ONLY with raw JSON, no markdown, no backticks, no explanation:
{"greetingMorning":"Good morning, ${name}","greetingAfternoon":"Good afternoon, ${name}","greetingEvening":"Good evening, ${name}","subMorning":"2-3 warm sentences about the morning ahead referencing the Gulf view","subAfternoon":"2-3 warm afternoon sentences","subEvening":"2-3 warm evening sentences mentioning the sunset","morning":{"eat":[{"name":"Ruby Slipper Cafe","tip":"French toast is legendary"},{"name":"Donut Hole Bakery","tip":"Local favorite since 1978"},{"name":"Crackings","tip":"Crab benedict is a must"}],"do":[{"name":"Beach walk at sunrise","tip":"Best shells at low tide"},{"name":"Parasailing","tip":"Calm winds perfect today"},{"name":"Snorkeling at Jetties","tip":"Crystal clear visibility"}]},"afternoon":{"eat":[{"name":"AJs Seafood","tip":"Fresh Gulf oysters"},{"name":"The Back Porch","tip":"Toes in the sand dining"},{"name":"Dewey Destins","tip":"Local seafood classic"}],"do":[{"name":"Crab Island","tip":"Afternoon is perfect"},{"name":"Paddleboarding","tip":"Glassy water today"},{"name":"Destin Commons","tip":"Beat the afternoon heat"}]},"evening":{"eat":[{"name":"Harbor Docks","tip":"Best harbor views in Destin"},{"name":"The Edge SkyBar","tip":"Panoramic Gulf views"},{"name":"Osaka Japanese","tip":"Best hibachi show"}],"tonight":[{"name":"Sunset from balcony","tip":"${ss} tonight"},{"name":"Harbor Boardwalk Stroll","tip":"Evening lights on the water"},{"name":"Live music at HarborWalk","tip":"Check local listings"}]}}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    return res.status(200).json({ content: response.content });
  } catch (err) {
    console.error('recs error:', err);
    return res.status(500).json({ error: 'Failed to get recommendations' });
  }
}
