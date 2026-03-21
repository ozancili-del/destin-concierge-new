export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mode, target, comparables, customer, peers, deal, leakage, rep, approval, alert, intel } = req.body;

  const systemPrompt = `You are the Global Pricing Lead at Comply365, an enterprise SaaS platform for aviation, defense, rail, and space compliance. You combine deal desk rigour with CFO-level commercial instincts. You are direct, specific, and actionable. You name accounts. You never hedge.`;

  let userPrompt = '';

  if (mode === 'customer') {
    const c = customer;
    userPrompt = `Analyse this existing Comply365 customer.
Customer: ${c.name} | ${c.ind} | ${c.seg} | ${c.reg}
ARR: ${c.arr} | NRR: ${c.nrr}% | Discount: ${c.disc}% | Health: ${c.health}/100 | LTV/CAC: ${c.ltv}x
MINT: ${c.mintAttached?'Yes':'No'} | Beams: ${c.beamsAttached?'Yes':'No'} | Churn risk: ${c.churnRisk?'YES':'No'}
Trends: ARR ${c.arrTrend}, NRR ${c.nrrTrend}, Discount ${c.discTrend}
Segment averages: NRR ${c.segAvgNRR}%, Discount ${c.segAvgDisc}%, Health ${c.segAvgHealth}
Peers: ${peers}

4-part analysis:
1. BENCHMARK: Compare to named peers with specific numbers.
2. PRICING HEALTH: Is discount justified? Leaving money on the table or churn risk?
3. EXPANSION OPPORTUNITY: Missing modules upsell argument specific to their industry.
4. RENEWAL RECOMMENDATION: Concrete action with specific uplift % or intervention.`;

  } else if (mode === 'deal') {
    const d = deal;
    userPrompt = `Build a value-based deal narrative for this Comply365 opportunity.
Account: ${d.name} | ${d.ind} | ${d.seg} | Deal type: ${d.dealMode}
Users: ${d.users} | Avg salary: $${d.salary}/yr | Compliance hrs saved/user/yr: ${d.hrs} | Incidents/yr: ${d.incidents}
Modules: ${d.activeMods} | Missing: ${d.missing||'None'}
Term: ${d.term}yr | Situation: ${d.comp} | Discount: ${d.disc}% | Reason: ${d.reason}
${d.dealMode!=='new'?`Current ARR: ${d.existingARR} | Current NRR: ${d.existingNRR} | Churn risk: ${d.churnRisk}`:''}

4-part deal narrative:
1. VALUE STORY: ROI in plain language with a dollar figure the rep can say in the room.
2. PRICE ANCHOR: How to position price relative to value. What % of value are we capturing.
3. DISCOUNT POSITION: Is the discount justified? How to frame it as commitment not price cut. If not justified, suggest alternative lever.
4. PITCH ANGLE: One sentence the rep leads with. Specific to this industry and account.`;

  } else if (mode === 'leakage') {
    const l = leakage;
    userPrompt = `Analyse this pricing leakage driver at Comply365.
Driver: ${l.driver} | Category: ${l.category} | ARR at risk: ${l.arv} | ${l.pct}% of total leakage
Contributing accounts: ${l.accounts}

3-part analysis:
1. ROOT CAUSE: Why is this leakage happening? What behaviour or process failure is driving it? Be specific.
2. ACCOUNT PATTERN: What do the contributing accounts have in common? Name them.
3. FIX RECOMMENDATION: Exactly what the Pricing Lead should do to close this leak — governance change, rep coaching, pricing model fix, or approval threshold adjustment. Give a specific action with expected ARR recovery.`;

  } else if (mode === 'rep') {
    const r = rep;
    userPrompt = `Write a pricing coaching note for this Comply365 sales rep.
Rep: ${r.name} | Region: ${r.reg} | Deals: ${r.deals}
NRR: ${r.nrr}% | Avg discount: ${r.disc}% | Win rate: ${r.win}% | Quota attainment: ${r.quota}%
Problem accounts: ${r.problemAccounts||'None identified'}

3-part coaching note (write as Pricing Lead to Sales Director):
1. ASSESSMENT: What does the data say about this rep's pricing discipline? Be direct and specific.
2. PATTERN: What behaviour is driving the discount level or NRR performance? Name specific accounts where relevant.
3. ACTION: Exactly what you want this rep to do differently on their next deal. One concrete, specific recommendation.

Tone: direct but constructive — coaching not punishing.`;

  } else if (mode === 'approval') {
    const a = approval;
    userPrompt = `You are the Global Pricing Lead at Comply365 reviewing a pending discount approval.

Deal: ${a.company} | ${a.ind} | ${a.seg} | ${a.reg}
Rep: ${a.rep} | Discount requested: ${a.disc}% | ARR: ${a.arr} | Term: ${a.term} year(s)
Modules: ${a.modules} | Approval gate: ${a.step} | Pending: ${a.age}
Reason given by rep: ${a.reason || 'None provided'}
Segment avg discount: ${a.avgDisc}% | Segment avg NRR: ${a.avgNRR}%

Give a 3-part approval recommendation:
1. VERDICT: Approve, Request Justification, or Reject — and why in one sentence. Be direct.
2. RISK ASSESSMENT: Is this discount justified given the segment benchmarks? What does the ${a.disc}% vs ${a.avgDisc}% avg tell you? What is the ARR and margin impact?
3. QUESTIONS FOR THE REP: 2-3 specific questions the Pricing Lead should ask ${a.rep} before making a final decision. Make them pointed and commercial.

Tone: internal Pricing Lead review — direct, data-driven, no fluff.`;

  } else if (mode === 'alert') {
    const a = alert;
    userPrompt = `You are the Global Pricing Lead at Comply365 preparing a CFO briefing note on an executive alert.

Alert: ${a.title}
Context: ${a.context}
Detail: ${a.detail}
Related accounts: ${a.accounts || 'See portfolio data'}

Write a 3-part CFO briefing note:
1. SITUATION: What is the commercial risk or opportunity in 2 sentences. Be specific with numbers.
2. ROOT CAUSE: Why is this happening? What pricing or governance failure or opportunity is driving it?
3. RECOMMENDED ACTION: Exactly what the Pricing Lead should do in the next 30 days. One specific, concrete action with expected outcome.

Tone: CFO briefing — concise, data-driven, decisive. No fluff. Write like you are the Pricing Lead presenting to the CFO.`;

  } else {
    const intelSection = intel ? `

REAL COMPANY INTELLIGENCE (sourced from annual reports — use these specific facts):
- Compliance & Cost Exposure: ${intel.complianceCosts}
- CEO/CFO Strategic Priorities: ${intel.strategicPriorities}
- Technology Investment: ${intel.techInvestment}
- Regulatory Pressure: ${intel.regulatoryPressure}
- Key Executive Quotes: ${intel.keyQuotes}
- Pricing Anchor: ${intel.pricingAnchor}

Ground your entire response in these specific facts. Use real numbers. Quote their executives directly where relevant.` : '';

    userPrompt = `Price a new logo deal at Comply365.
Target: ${target.name} | ${target.ind} | ${target.seg} | ${target.reg} | ${target.emp.toLocaleString()} employees | Revenue ${target.rev}
Pain: ${target.pain} | Fit score: ${target.fit}%
Comparable customers: ${comparables}
${intelSection}

5-part pricing approach:
1. VALUE ANCHOR: Lead with a specific dollar figure from their own cost base — what problem are we solving and what is it worth to them specifically?
2. PRICE RECOMMENDATION: Recommended entry tier and ARR. Justify it as % of their quantified cost exposure.
3. DISCOUNT STRATEGY: Walk-away floor and any commitment rate lever. Be specific.
4. EXECUTIVE PITCH: One sentence using their own language (from earnings calls or CEO statements if available) that positions Comply365 as their solution.
5. EXPANSION PATH: First 12 months and year 2 upsell opportunity.`;
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
        max_tokens: 800,
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
