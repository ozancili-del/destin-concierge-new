import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt, building, guestName, weather, timeSlot } = req.body;

  const dw = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Chicago' });
  const th = weather?.[0]?.high || 78;
  const name = guestName || 'Guest';
  const loc = building || 'Destin, Florida';

  const systemPrompt = `You are a warm vacation rental concierge for ${loc}. Guest: ${name}. Today: ${dw}. Weather: ${th}°F high. Respond ONLY with raw JSON, no markdown, no backticks.`;

  const userPrompt = prompt || `Generate recommendations JSON with keys: greetingMorning, greetingAfternoon, greetingEvening, subMorning, subAfternoon, subEvening, morning (eat/do arrays with name+tip), afternoon (eat/do), evening (eat/tonight). Use real Destin restaurants and activities.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: systemPrompt + '\n\n' + userPrompt }]
    });

    return res.status(200).json({ content: response.content });
  } catch (err) {
    console.error('guestview-recs error:', err);
    return res.status(500).json({ error: 'Failed to get recommendations' });
  }
}
