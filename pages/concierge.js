// pages/concierge.js
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

function generateSessionId() {
  return "db_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default function Concierge() {
  const router = useRouter();
  const [log, setLog] = useState([
    { role: "assistant", content: "Hey there! 👋 I'm Destiny Blue — I can check live availability for both units, build you a booking link in seconds, recommend dolphin tours and activities, or connect you straight to Ozan. What can I help you with? 😊" }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [pendingRelay, setPendingRelay] = useState(false);
  const [ozanAcked, setOzanAcked] = useState(false);
  const [ozanAckType, setOzanAckType] = useState(null);
  const [ozanInvited, setOzanInvited] = useState(false);  // @ozan typed, waiting
  const [ozanIsActive, setOzanIsActive] = useState(false); // Ozan in chat
  const lastSeenTsRef = useRef(0); // useRef avoids stale closure in setInterval
  const sessionIdRef = useRef(null);
  const chatEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const ozanTokenRef = useRef(null); // stores invite token for ozan-send calls

  const guestBidRef = useRef(null);
  const guestBookingRef = useRef(null); // stores booking data for context in follow-up messages

  // Effect 1: session ID init (runs once on mount)
  useEffect(() => {
    try {
      let sid = localStorage.getItem("destiny_session_id");
      if (!sid) { sid = generateSessionId(); localStorage.setItem("destiny_session_id", sid); }
      sessionIdRef.current = sid;
    } catch (e) {
      sessionIdRef.current = generateSessionId();
    }
  }, []);

  // Effect 2: magic link — runs when router is ready and has query params
  useEffect(() => {
    if (!router.isReady) return;
    const bid = router.query.bid;
    const fname = router.query.fname;
    if (!bid) return;

    guestBidRef.current = bid;
    setLog([]);
    setBusy(true);

    // Ensure session ID exists before fetching
    let sid = sessionIdRef.current;
    if (!sid) {
      try { sid = localStorage.getItem("destiny_session_id") || generateSessionId(); }
      catch(e) { sid = generateSessionId(); }
      sessionIdRef.current = sid;
    }

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [], sessionId: sid, guestBid: bid, pageSource: "ai-concierge" }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.reply) {
          setLog([{ role: "assistant", content: data.reply }]);
          if (data.guestBooking) guestBookingRef.current = data.guestBooking;
        } else {
          setLog([{ role: "assistant", content: `Hey${fname ? " " + fname : " there"}! 🌊 I'm Destiny Blue — ask me anything about your stay! 😊` }]);
        }
      })
      .catch(() => {
        setLog([{ role: "assistant", content: `Hey${fname ? " " + fname : " there"}! 🌊 I'm Destiny Blue — ask me anything about your stay! 😊` }]);
      })
      .finally(() => setBusy(false));
  }, [router.isReady, router.query.bid]);

  // Poll for Ozan activity when invited or active
  useEffect(() => {
    if (!ozanInvited && !ozanIsActive) return;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const poll = async () => {
      if (!sessionIdRef.current) return;
      try {
        const r = await fetch(`/api/ozan-poll?s=${sessionIdRef.current}&since=${lastSeenTsRef.current}&_t=${Date.now()}`);
        const data = await r.json();

        // Ozan just joined (transition from PENDING to TRUE)
        if (data.ozanActive === "TRUE" && !ozanIsActive) {
          setOzanIsActive(true);
          setOzanInvited(false);
          setLog(l => [...l, { role: "system", content: "🟢 Ozan has joined the chat" }]);
        }
        // Still pending — keep polling silently

        // Ozan left
        if (data.ozanActive === "FALSE" && ozanIsActive) {
          setOzanIsActive(false);
          clearInterval(pollIntervalRef.current);
          setLog(l => [...l, { role: "system", content: "Ozan has left the chat — I'm back! 😊" }]);
        }

        // New messages from Ozan
        if (data.messages?.length > 0) {
          const newMsgs = data.messages.filter(m => m.role === "ozan");
          if (newMsgs.length > 0) {
            setLog(l => [...l, ...newMsgs.map(m => ({ role: "ozan", content: m.text }))]);
            lastSeenTsRef.current = Math.max(...newMsgs.map(m => m.ts));
          }
        }
      } catch (e) { /* ignore */ }
    };

    pollIntervalRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollIntervalRef.current);
  }, [ozanInvited, ozanIsActive]); // lastSeenTs is now a ref, no dep needed

  // Scroll INSIDE the chat box, not the whole page
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [log, busy]);

  async function send(e) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");

    // If Ozan is invited or active — route to Ozan, don't call Destiny Blue
    if (ozanIsActive || ozanInvited) {
      setLog(l => [...l, { role: "user", content: text }]);
      try {
        await fetch("/api/ozan-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current, text, t: ozanTokenRef.current || "pending", role: "guest" }),
        });
      } catch(e) { /* store best-effort */ }
      if (!ozanIsActive) {
        // Still waiting for Ozan to join — show holding message
        setLog(l => [...l, { role: "system", content: "⏳ Message held — Ozan will see it when he joins" }]);
      }
      return;
    }

    const userMsg = { role: "user", content: text };
    setLog(l => [...l, userMsg]);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...log, userMsg], sessionId: sessionIdRef.current, alertSent, pendingRelay, ozanAcked, ozanAckType, pageSource: "ai-concierge", sawBanner: typeof localStorage !== "undefined" ? (localStorage.getItem('db_saw_banner') || sessionStorage.getItem('db_saw_banner')) : null, guestBooking: guestBookingRef.current || null })
      });
      const data = await r.json();
      if (data.alertSent) setAlertSent(true);
      setPendingRelay(data.pendingRelay === true);
      if (data.ozanAcked) setOzanAcked(true);
      if (data.ozanAckType) setOzanAckType(data.ozanAckType);
      if (data.ozanAckType && !ozanAckType) {
        setAlertSent(false);
        setOzanAcked(false);
      }
      // @ozan invited — start polling
      if (data.ozanInvited) {
        setOzanInvited(true);
        if (data.ozanToken) ozanTokenRef.current = data.ozanToken;
      }
      // Ozan active (TRUE or PENDING) — suppress bot reply, ensure polling runs
      if (data.ozanActive === "TRUE" || data.ozanActive === "PENDING" || data.ozanActive === true) {
        if (data.ozanActive === "TRUE") setOzanIsActive(true);
        setOzanInvited(true); // start polling regardless
        return; // no bot bubble
      }
      // Sentinel or empty reply — suppress
      const reply = data?.reply;
      if (!reply || reply === "⏳") return;
      setLog(l => [...l, { role: "assistant", content: reply }]);
    } catch {
      setLog(l => [...l, { role: "assistant", content: "Sorry—there was an error reaching the bot." }]);
    } finally {
      setBusy(false);
    }
  }

  const linkify = (t) =>
    t.replace(/(https?:\/\/[^\s]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`)
     .replace(/\n/g, "<br/>");

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 12, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, margin: "8px 0" }}>Destiny Blue — Your AI Concierge</h1>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        {/* scrollContainerRef on THIS div — scrolls internally, page stays still */}
        <div
          ref={scrollContainerRef}
          style={{ height: 520, overflowY: "auto", padding: 12, background: "#fff" }}
        >
          {log.map((m, i) => {
            if (m.role === "system") return (
              <div key={i} style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", margin: "6px 0", fontStyle: "italic" }}>
                {m.content}
              </div>
            );
            const isUser = m.role === "user";
            const isOzan = m.role === "ozan";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 8 }}>
                <div style={{ maxWidth: "82%" }}>
                  {isOzan && <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2, fontWeight: "bold" }}>Ozan</div>}
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 14,
                      background: isUser ? "#111827" : isOzan ? "#0369a1" : "#f3f4f6",
                      color: isUser || isOzan ? "#fff" : "#111827",
                      wordBreak: "break-word"
                    }}
                  >
                    {isUser ? m.content : <div dangerouslySetInnerHTML={{ __html: linkify(m.content) }} />}
                  </div>
                </div>
              </div>
            );
          })}
          {ozanInvited && !ozanIsActive && (
        <div style={{ fontSize: 12, color: "#0369a1", fontWeight: "bold", padding: "4px 0" }}>
          🟡 Connecting you with Ozan — type and he'll see your messages when he joins…
        </div>
      )}
      {busy && !ozanInvited && <div style={{ fontSize: 12, color: "#6b7280" }}>Destiny Blue is typing…</div>}
      {ozanIsActive && busy && <div style={{ fontSize: 12, color: "#6b7280" }}>Ozan is typing…</div>}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={send} style={{ display: "flex", gap: 8, borderTop: "1px solid #e5e7eb", padding: 8, background: "#fafafa" }}>
          <textarea
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="e.g. 2025-10-10 to 2025-10-15, 2 adults 1 child"
            style={{ flex: 1, resize: "none", padding: 8, borderRadius: 12, border: "1px solid #e5e7eb" }}
          />
          <button
            type="submit"
            disabled={busy}
            style={{ padding: "8px 14px", borderRadius: 12, border: 0, background: "#2563eb", color: "#fff", opacity: busy ? 0.6 : 1 }}
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
