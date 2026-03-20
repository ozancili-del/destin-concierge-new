export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mode, target, comparables, customer, peers } = req.body;

  const systemPrompt = `You are the Global Pricing Lead at Comply365, an enterprise SaaS platform for aviation, defense, rail, and space compliance. You combine the analytical rigour of a deal desk with the commercial instincts of a revenue-focused CFO partner. You are direct, specific, and data-driven. You name accounts by name. You never hedge or speak in generalities. Every insight is actionable.`;

  let userPrompt = '';

  if (mode === 'customer') {
    const c = customer;
    userPrompt = `Analyse this existing Comply365 customer from a pricing and commercial health perspective.

Customer: ${c.name}
Industry: ${c.ind} | Segment: ${c.seg} | Region: ${c.reg}
Current ARR: ${c.arr} | NRR: ${c.nrr}% | Discount: ${c.disc}% | Health Score: ${c.health}/100 | LTV/CAC: ${c.ltv}x
MINT module attached: ${c.mintAttached ? 'Yes' : 'No'} | Beams AI attached: ${c.beamsAttached ? 'Yes' : 'No'}
Churn risk flagged: ${c.churnRisk ? 'YES' : 'No'}
ARR trend (6 qtrs): ${c.arrTrend} | NRR trend: ${c.nrrTrend} | Discount trend: ${c.discTrend}
Segment averages: NRR ${c.segAvgNRR}%, Discount ${c.segAvgDisc}%, Health ${c.segAvgHealth}

Peer accounts (same industry + segment): ${peers}

Give a structured 4-part analysis:
1. BENCHMARK: How does this account compare to named peers and segment averages? Call out specific gaps or advantages by name.
2. PRICING HEALTH: Is the current discount justified given their NRR and expansion trajectory? Are we leaving money on the table or is there churn risk?
3. EXPANSION OPPORTUNITY: What modules are missing (MINT, Beams, tier upgrade)? What is the upsell argument specific to their industry pain?
4. RENEWAL RECOMMENDATION: Concrete action — uplift X%, hold price, restructure deal, or flag for at-risk intervention. Give a specific number.

Be direct. Name accounts. Give percentages and dollar figures where possible.`;

  } else {
    userPrompt = `You are pricing a new logo deal at Comply365.

Target: ${target.name} | ${target.ind} | ${target.seg} | ${target.reg} | ${target.emp.toLocaleString()} employees | Revenue ${target.rev} | Pain: ${target.pain} | Fit score: ${target.fit}%

Comparable portfolio customers (same industry/segment): ${comparables}

Give a 5-sentence pricing approach:
1. Recommended entry tier and price anchor
2. Discount strategy and walk-away floor
3. Value metrics to lead with in the conversation
4. Competitive positioning
5. Expansion path post-close

Be specific, commercial, and direct. No fluff.`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.status(200).json({ result: data.choices[0].message.content });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
