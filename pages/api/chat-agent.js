// pages/api/chat-agent.js
// Destiny Blue Agent v3 — Responses API tool loop. The live pages/api/chat.js is untouched.

import OpenAI from "openai";
import {
  applyStatePatch,
  createDefaultState,
  inferLegacyState,
  normalizeState,
  OWNER_CONTACT,
} from "../../lib/destiny-agent/business.js";
import { createServices } from "../../lib/destiny-agent/services.js";
import { runAgentTurn } from "../../lib/destiny-agent/orchestrator.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const services = createServices();

const PAGE_SOURCE_GREETINGS = Object.freeze({
  popup: "Ah, you found the secret door! 🌊 Who do I have the pleasure of welcoming to Destin today?",
  fireworks: "🎆 Fireworks fan? Same. Destin does them better than anywhere. What would you like to know?",
  events: "🎉 Planning your Destin trip around the events calendar is a smart move. What can I help you plan?",
  airport: "✈️ Still planning the trip or already on the way? I can help with flights, directions, and your stay.",
  "beach-cam": "🌊 Checking the beach before you commit — love that. What would you like to know about Pelican Beach?",
  "best-time": "📅 Smart to research the timing first. Tell me what matters most for your trip and I’ll help narrow it down.",
  restaurants: "🍽️ Great taste — Destin has an incredible food scene. What kind of place are you looking for?",
  beaches: "🏖️ Already in the right headspace. What would you like to know about the beaches around Destin?",
});

function latestUserMessage(messages) {
  return [...(Array.isArray(messages) ? messages : [])].reverse().find(message => message?.role === "user")?.content || "";
}

function mergeConversationHistory(sessionHistory, requestMessages) {
  const merged = [];
  for (const message of [...(sessionHistory || []), ...(requestMessages || [])]) {
    if (!message || !["user", "assistant"].includes(message.role)) continue;
    const normalized = { role: message.role, content: String(message.content || "") };
    const previous = merged.at(-1);
    if (previous && previous.role === normalized.role && previous.content === normalized.content) continue;
    merged.push(normalized);
  }
  return merged.slice(-24);
}

function formatClock(value, fallback) {
  if (!value) return fallback;
  if (/^\d{2}:\d{2}$/.test(value)) {
    const [hour, minute] = value.split(":").map(Number);
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
  }
  return value;
}

function existingGuestGreeting(booking) {
  const name = booking.guestFirstName || "there";
  if (booking.isCheckedOut) {
    return `Hey ${name}! 🌊 It looks like your stay has wrapped up — I hope you had an amazing time at Pelican Beach. Ozan can help with anything still outstanding at ${OWNER_CONTACT.phone}.`;
  }
  const checkIn = formatClock(booking.checkIn, "4:00 PM");
  const checkOut = formatClock(booking.checkOut, "10:00 AM");
  let reply = `Hey ${name}! 🌊 Here’s a quick look at your stay:\n\n`;
  reply += `🏖️ Unit ${booking.unit} at Pelican Beach Resort\n`;
  reply += `📅 ${booking.arrivalFmt} → ${booking.departureFmt} (${booking.nights} nights)\n`;
  reply += `🕓 Check-in: ${checkIn} · Check-out: ${checkOut}\n`;
  if (booking.doorCode) reply += `🔑 Door code: ${booking.doorCode}\n`;
  else if (booking.daysUntilArrival > 7) reply += `🔑 Your door code will be available seven days before arrival.\n`;
  reply += `📶 Wi-Fi: Pelican-guest.encowifi.com · Password: 54541884\n`;
  reply += `📍 1002 Highway 98 E, Destin, FL 32541 · Front desk: (850) 654-1425\n\n`;
  reply += "What do you need help with for your stay?";
  return reply;
}

function summarizeToolStatus(toolResults) {
  const availability = [...(toolResults || [])].reverse().find(result => result.name === "check_availability");
  if (availability) {
    const query = availability.data?.query;
    const unitText = (availability.data?.units || []).map(unit => `${unit.unit}:${unit.available === true ? "AVAILABLE" : unit.available === false ? "BOOKED" : "UNKNOWN"}`).join("|");
    return `DATES:${query?.arrival || "?"}->${query?.departure || "?"}|${unitText || availability.status}`;
  }
  const alert = [...(toolResults || [])].reverse().find(result => result.kind === "alert");
  if (alert) return alert.data?.severity?.toUpperCase() || alert.status?.toUpperCase() || "ALERT";
  return "INFO";
}

export function createHandler({ openaiClient = openai, servicesClient = services } = {}) {
  return async function handler(req, res) {
    const openai = openaiClient;
    const services = servicesClient;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Destiny-Version", "agent-v3-responses");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ ok: true, status: "Destiny Blue agent v3 is online" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      messages = [],
      sessionId = null,
      alertSent: priorAlertSent = false,
      pendingRelay: priorPendingRelay = false,
      ozanAcked: priorOzanAcked = false,
      ozanAckType: priorOzanAckType = null,
      pageSource = null,
      guestBid = null,
      guestSig = null,
      sig = null,
      sawBanner = null,
      tickerUnit = null,
    } = req.body || {};
    const latestUser = latestUserMessage(messages);
    const debugEnabled = process.env.DESTINY_AGENT_DEBUG === "true";

    // Deliberately preserved owner/admin phrase from v1, per owner instruction.
    if (/lets\s+go\s+mf/i.test(latestUser)) {
      try {
        const snapshot = await services.runAdminPriceSnapshot();
        const reply = snapshot.success
          ? `✅ Price snapshot complete — saved ${snapshot.saved} rows for ${snapshot.captured_date}. Beach deals page refreshed. 💾`
          : `⚠️ Snapshot ran but something felt off: ${snapshot.error || "unknown error"}`;
        return res.status(200).json({ reply, alertSent: false, pendingRelay: false, ozanAcked: false, ozanAckType: null, detectedIntent: "INFO", debug: { endpoint: "agent-v3", adminSnapshot: true } });
      } catch (error) {
        return res.status(200).json({ reply: `⚠️ Snapshot failed: ${error.message}`, alertSent: false, pendingRelay: false, ozanAcked: false, ozanAckType: null, detectedIntent: "INFO", debug: { endpoint: "agent-v3", adminSnapshot: true, error: error.message } });
      }
    }

    if (messages.length === 0 && PAGE_SOURCE_GREETINGS[pageSource]) {
      const greeting = PAGE_SOURCE_GREETINGS[pageSource];
      await services.logToSheets(sessionId, `__${pageSource}_open__`, greeting, "", "INFO", "");
      return res.status(200).json({ reply: greeting, alertSent: false, pendingRelay: false, ozanAcked: false, ozanAckType: null, detectedIntent: "INFO", debug: { endpoint: "agent-v3", greeting: pageSource } });
    }

    const [sessionData, sessState] = await Promise.all([
      services.loadSession(sessionId),
      services.readSessState(sessionId),
    ]);
    const ozanAckType = sessState?.ozanAckType || sessionData.ozanAckType || priorOzanAckType || null;
    const ozanAcknowledged = Boolean(ozanAckType || priorOzanAcked);
    const ozanActiveState = sessState?.ozanActive || "FALSE";
    const ozanIsActive = ozanActiveState === "TRUE" || ozanActiveState === "PENDING";

    if (ozanIsActive && latestUser) {
      const existingMessages = Array.isArray(sessState?.ozanMessages) ? sessState.ozanMessages : [];
      await services.writeSessState(sessionId, {
        ozanMessages: [...existingMessages, { role: "guest", text: latestUser, ts: Date.now() }].slice(-100),
      });
      return res.status(200).json({
        reply: "",
        ozanActive: ozanActiveState,
        alertSent: priorAlertSent,
        pendingRelay: false,
        ozanAcked: ozanAcknowledged,
        ozanAckType,
        detectedIntent: "OZAN_ACTIVE",
        debug: { endpoint: "agent-v3", ownerChatActive: true },
      });
    }

    let state = sessState?.v2State
      ? normalizeState(sessState.v2State)
      : inferLegacyState(mergeConversationHistory(sessionData.history, messages));
    state = applyStatePatch(state, {
      flags: { alertSent: state.flags.alertSent || Boolean(priorAlertSent) },
      ownerChat: { relayPending: state.ownerChat.relayPending || Boolean(priorPendingRelay) },
      meta: { pageSource, updatedAt: new Date().toISOString() },
    });

    // Existing-guest links are resolved by code, not by the model. If GUEST_LINK_SECRET
    // is configured, guestSig is required; otherwise legacy guestBid links continue to work.
    if (guestBid && !state.existingGuest.authorized) {
      const authorization = services.verifyGuestLinkSignature(guestBid, guestSig || sig);
      if (authorization.ok) {
        const booking = await services.fetchGuestBooking(guestBid);
        if (booking) {
          state = applyStatePatch(state, {
            mode: "existing_guest",
            existingGuest: { authorized: true, bookingId: String(guestBid), booking },
            booking: { arrival: booking.arrival, departure: booking.departure, adults: booking.adults ?? null, children: booking.children ?? null, preferredUnit: booking.unit },
            verified: { facts: [`Authorized booking for Unit ${booking.unit}, ${booking.arrival} through ${booking.departure}.`] },
          });
          if (messages.length === 0) {
            const reply = existingGuestGreeting(booking);
            await Promise.all([
              services.writeSessState(sessionId, { v2State: state }),
              services.logToSheets(sessionId, "__existing_guest_open__", reply, `${booking.arrival} to ${booking.departure}`, "EXISTING_GUEST", ""),
            ]);
            return res.status(200).json({ reply, guestBooking: booking, alertSent: false, pendingRelay: false, ozanAcked: ozanAcknowledged, ozanAckType, detectedIntent: "INFO", debug: { endpoint: "agent-v3", existingGuest: true, legacyUnsignedLink: authorization.legacy } });
          }
        }
      } else if (messages.length === 0) {
        const reply = `I couldn’t verify that booking link. Please contact Ozan at ${OWNER_CONTACT.phone} or ${OWNER_CONTACT.email} so he can help securely.`;
        return res.status(200).json({ reply, alertSent: false, pendingRelay: false, ozanAcked: ozanAcknowledged, ozanAckType, detectedIntent: "INFO", debug: { endpoint: "agent-v3", existingGuestAuthorization: authorization.reason } });
      }
    }

    if (!latestUser) {
      const reply = "Hey there! 🌊 What can I help you with in Destin today?";
      return res.status(200).json({ reply, alertSent: state.flags.alertSent, pendingRelay: state.ownerChat.relayPending, ozanAcked: ozanAcknowledged, ozanAckType, detectedIntent: "INFO", debug: { endpoint: "agent-v3", emptyTurn: true } });
    }

    const conversation = mergeConversationHistory(sessionData.history, messages);
    const result = await runAgentTurn({
      openai,
      model: process.env.DESTINY_AGENT_MODEL || "gpt-5.6-sol",
      services,
      state,
      messages: conversation,
      latestUser,
      sessionId,
      guestBid,
      guestSig: guestSig || sig,
      pageSource,
      sawBanner: Boolean(sawBanner),
      ozanAckType,
      now: new Date(),
      logger: console,
      maxToolRounds: 4,
    });

    state = result.state;
    state.meta.pageSource = pageSource;
    const datesAsked = state.booking.arrival && state.booking.departure ? `${state.booking.arrival} to ${state.booking.departure}` : "";
    const availabilityStatus = summarizeToolStatus(result.toolResults);
    const alertSummary = state.flags.alertSent && state.openIssues.length
      ? JSON.stringify({ issues: state.openIssues.map(issue => issue.description || issue), ts: new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }) })
      : "";

    await Promise.all([
      services.writeSessState(sessionId, { v2State: state }),
      services.logToSheets(sessionId, latestUser, result.reply, datesAsked, availabilityStatus || result.detectedIntent, alertSummary),
    ]);

    return res.status(200).json({
      reply: result.reply,
      alertSent: state.flags.alertSent,
      pendingRelay: state.ownerChat.relayPending,
      ozanAcked: ozanAcknowledged,
      ozanAckType,
      detectedIntent: result.detectedIntent,
      debug: debugEnabled ? {
        endpoint: "agent-v3",
        model: result.debug.model,
        toolCalls: result.debug.toolCalls,
        toolRounds: result.debug.toolRounds,
        agentic: result.debug.agentic,
        api: result.debug.api,
        responseRounds: result.debug.responseRounds,
        responseDiagnostics: result.debug.responseDiagnostics,
        agentError: result.debug.agentError,
        validation: result.debug.validation,
        state: {
          mode: state.mode,
          booking: state.booking,
          awaiting: state.awaiting,
          flight: state.flight,
          flags: state.flags,
        },
        pageSource,
        tickerUnit,
      } : {
        endpoint: "agent-v3",
        agentic: true,
        api: "responses",
        toolNames: result.debug.toolCalls.map(call => call.name),
        toolRounds: result.debug.toolRounds,
        validationOk: result.debug.validation?.ok === true,
      },
    });
  } catch (error) {
    console.error("Destiny Blue agent v3 error:", error);
    const reply = error?.status === 401
      ? `I’m having trouble connecting. Please call ${OWNER_CONTACT.phone} or email ${OWNER_CONTACT.email}.`
      : `I hit a temporary snag. Please try again or call ${OWNER_CONTACT.phone}.`;
    return res.status(200).json({
      reply,
      alertSent: false,
      pendingRelay: false,
      ozanAcked: false,
      ozanAckType: null,
      detectedIntent: "INFO",
      debug: { endpoint: "agent-v3", error: error.message },
    });
  }
  };
}

export default createHandler();
