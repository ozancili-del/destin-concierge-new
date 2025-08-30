// pages/api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await resp.json();
    const reply =
      data?.choices?.[0]?.message?.content || "Sorry, I couldn’t generate a reply.";
    res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    res.status(200).json({ reply: "I hit an error. Please try again." });
  }
}
