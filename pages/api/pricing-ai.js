export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mode, target, comparables, customer, peers, deal } = req.body;

  const systemPrompt = `You are the Global Pricing Lead at Comply365, an enterprise SaaS platform for aviation, defense, rail, and space compliance. You are a value-based pricing expert who helps Sales win on outcomes, not price. You are direct, specific, and commercial. You name accounts. You never hedge. Every recommendation is actionable.`;

  let userPrompt = '';

  if (mode === 'customer') {
    const c = customer;
    userPrompt = `Analyse this existing Comply365 customer from a pricing and commercial health perspective.

Customer: ${c.name} | Industry: ${c.ind} | Segment: ${c.seg} | Region: ${c.reg}
ARR: ${c.arr} | NRR: ${c.nrr}% | Discount: ${c.disc}% | Health: ${c.health}/100 | LTV/CAC: ${c.ltv}x
MINT attached: ${c.mintAttached?'Yes':'No'} | Beams attached: ${c.beamsAttached?'Yes':'No'} | Churn risk: ${c.churnRisk?'YES':'No'}
ARR trend: ${c.arrTrend} | NRR trend: ${c.nrrTrend} | Discount trend: ${c.discTrend}
Segment averages: NRR ${c.segAvgNRR}%, Discount ${c.segAvgDisc}%, Health ${c.segAvgHealth}
Peers: ${peers}

Give a structured 4-part analysis:
1. BENCHMARK: Compare to named peers and segment averages with specific numbers.
2. PRICING HEALTH: Is current discount justified? Are we leaving money on the table or is there churn risk?
3. EXPANSION OPPORTUNITY: Missing modules (MINT, Beams, tier upgrade)? Specific upsell argument for their industry.
4. RENEWAL RECOMMENDATION: Concrete action — uplift X%, hold, restructure, or at-risk flag. Give a specific number.

Be direct. Name accounts. Use percentages and dollar figures.`;

  } else if (mode === 'deal') {
    const d = deal;
    userPrompt = `Build a value-based deal narrative for this Comply365 opportunity.

Account: ${d.name} | Industry: ${d.ind} | Segment: ${d.seg}
Users: ${d.users} | Avg salary: $${d.salary}/yr | Compliance hrs saved/user/yr: ${d.hrs} | Incidents/yr: ${d.incidents}
Modules in deal: ${d.activeMods} | Missing modules: ${d.missing||'None'}
Contract term: ${d.term} year(s) | Competitor: ${d.comp} | Requested discount: ${d.disc}% | Reason: ${d.reason}

Give a 4-part deal narrative:
1. VALUE STORY: Quantify the ROI in plain language — efficiency savings + risk reduction. Give a dollar figure the rep can say in the room.
2. PRICE ANCHOR: How to position the price relative to the value delivered. What % of value are we capturing — and why that's fair.
3. DISCOUNT POSITION: Is the requested discount justified? If yes, how to frame it as a commitment/partnership concession not a price cut. If no, suggest an alternative lever.
4. PITCH ANGLE: The one sentence the rep should lead with in the meeting. Make it specific to this industry and account profile.

Be direct, specific, and commercial. Write like a deal desk expert coaching a rep before a call.`;

  } else {
    // Target new logo mode
    userPrompt = `Price a new logo deal at Comply365.

Target: ${target.name} | ${target.ind} | ${target.seg} | ${target.reg} | ${target.emp.toLocaleString()} employees | Revenue ${target.rev}
Pain: ${target.pain} | Fit score: ${target.fit}%
Comparable portfolio customers: ${comparables}

Give a 5-sentence pricing approach:
1. Recommended entry tier and price anchor
2. Discount strategy and walk-away floor
3. Value metrics to lead with
4. Competitive positioning
5. Expansion path post-close`;
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
