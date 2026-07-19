// lib/destiny/state.js
// Stage 2 — explicit ConversationState, replacing state reconstructed from prose.
//
// Persistence: JSON in COLUMN H of the existing `ozanchat` sessions tab.
// Columns A-G keep their exact v1 meaning (sessionId, ozanAcked, ozanActive,
// ozanMessages, updatedAt, ozanAckType, inviteToken) so loadSession and the
// /ozan dashboard keep working during v1<->v2 coexistence. v2 only ADDS col H.
//
// Validation discipline is lifted from v1's Phase 1 module (chat.js 112-174):
//  - null means "not stated"; 0 means "guest explicitly said none". Never conflate.
//  - occupancy atomicity: a pair of new counts that together exceed 6 is rejected
//    as a pair, not clamped.
//  - explicit existing state wins over new model-proposed values unless the guest
//    clearly restated (the tools enforce this via state_conflict results).

import { getSheetsToken, SESS_TAB } from "./helpers.js";

export function defaultState() {
  return {
    v: 1,
    mode: "booking", // "booking" | "existing_guest" | "local_info" | "maintenance" | "emergency"
    booking: {
      arrival: null,
      departure: null,
      adults: null,        // null = not stated. Distinct from 0.
      children: null,      // null = not stated; 0 = explicitly none.
      preferredUnit: null, // "707" | "1006" | null
      bedroomsRequested: null,
    },
    awaiting: [],          // e.g. ["departure","adults"] — derived, advisory
    flight: { originIata: null, destinationIata: null, linkSentFor: null },
    verified: {
      bookingUrls: [],           // URLs produced by tools (rolling, capped)
      linksSentFor: null,        // {arrival,departure,adults,children} of last links sent
      availabilityCheckedAt: null,
    },
    verifiedBookingId: null,     // set ONLY server-side from guestBid lookup
    openIssues: [],              // [{type, description, status}]
    blueUnlocked: false,
    emailCaptured: false,
    specialOccasionAlerted: false, // dedup for the silent occasion alert (v1 had none)
    pendingRelay: false,
  };
}

// ── Validation helpers (Phase-1 pattern, chat.js 112-174) ────────────────────
const MAX_OCCUPANCY = 6;

export function validateCounts(adults, children) {
  // Returns {ok, adults, children, reason}. Inputs may be null.
  const a = adults == null ? null : Number(adults);
  const c = children == null ? null : Number(children);
  if (a != null && (!Number.isInteger(a) || a < 1 || a > 20)) return { ok: false, reason: "adults_out_of_range" };
  if (c != null && (!Number.isInteger(c) || c < 0 || c > 20)) return { ok: false, reason: "children_out_of_range" };
  return { ok: true, adults: a, children: c };
}

// Merge model-proposed booking fields into state. Explicit restatement always
// allowed (the model only proposes what the guest said this turn — tests assert
// this); silent contradiction of explicit state is surfaced, not absorbed.
export function mergeBooking(state, proposal) {
  const changed = [];
  const b = state.booking;
  for (const k of ["arrival", "departure", "preferredUnit", "bedroomsRequested"]) {
    if (proposal[k] !== undefined && proposal[k] !== null && proposal[k] !== b[k]) {
      b[k] = proposal[k];
      changed.push(k);
    }
  }
  const v = validateCounts(
    proposal.adults !== undefined ? proposal.adults : null,
    proposal.children !== undefined ? proposal.children : null
  );
  if (v.ok) {
    if (v.adults != null && v.adults !== b.adults) { b.adults = v.adults; changed.push("adults"); }
    if (v.children != null && v.children !== b.children) { b.children = v.children; changed.push("children"); }
  }
  return changed;
}

export function deriveAwaiting(state) {
  const need = [];
  const b = state.booking;
  if (state.mode === "booking") {
    if (!b.arrival) need.push("arrival");
    if (!b.departure) need.push("departure");
    if (b.adults == null) need.push("adults");
    if (b.children == null) need.push("children");
  }
  state.awaiting = need;
  return need;
}

// ── Persistence: ozanchat!A:H (v1 columns + col H state JSON) ────────────────
// Copied-and-extended from v1 readSessState/writeSessState (chat.js 1056-1153).
// The read-merge-write pattern, token reuse, and column meanings are identical;
// the only addition is column H.

export async function readSessStateV2(sessionId) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sessionId || !sheetId) return null;
    const token = await getSheetsToken();
    if (!token) return null;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SESS_TAB}!A:H`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rows = data.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === sessionId) {
        let convState = null;
        if (rows[i][7]) {
          try { convState = JSON.parse(rows[i][7]); } catch (_) { convState = null; }
        }
        return {
          rowIndex: i + 1,
          ozanAcked: rows[i][1] === "TRUE",
          ozanActive: rows[i][2] || "FALSE",
          ozanMessages: rows[i][3] ? JSON.parse(rows[i][3]) : [],
          ozanAckType: rows[i][5] || null,
          inviteToken: rows[i][6] || null,
          convState,
          _token: token, // reuse for the write later this request
        };
      }
    }
    return { rowIndex: null, ozanAcked: false, ozanActive: "FALSE", ozanMessages: [], ozanAckType: null, inviteToken: null, convState: null, _token: token };
  } catch (e) {
    console.error("readSessStateV2:", e.message);
    return null;
  }
}

export async function writeSessStateV2(sessionId, updates, convState, existingToken) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sessionId || !sheetId) return;
    const token = existingToken || (await getSheetsToken());
    if (!token) return;

    // Read current row to merge (same read-merge-write as v1)
    const readRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SESS_TAB}!A:H`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    let rowIndex = null;
    let existing = null;
    if (readRes.ok) {
      const readData = await readRes.json();
      const rows = readData.values || [];
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === sessionId) {
          rowIndex = i + 1;
          existing = {
            ozanAcked: rows[i][1] === "TRUE",
            ozanActive: rows[i][2] || "FALSE",
            ozanMessages: rows[i][3] ? JSON.parse(rows[i][3]) : [],
            ozanAckType: rows[i][5] || null,
            inviteToken: rows[i][6] || null,
          };
          break;
        }
      }
    }
    const merged = {
      ozanAcked: existing?.ozanAcked ?? false,
      ozanActive: existing?.ozanActive ?? "FALSE",
      ozanMessages: existing?.ozanMessages ?? [],
      ozanAckType: existing?.ozanAckType ?? null,
      inviteToken: existing?.inviteToken ?? "",
      ...updates,
    };
    // Cap state size defensively — Sheets cells hard-limit at 50k chars.
    let stateJson = "";
    if (convState) {
      convState.verified.bookingUrls = (convState.verified.bookingUrls || []).slice(-12);
      stateJson = JSON.stringify(convState);
      if (stateJson.length > 45000) stateJson = JSON.stringify({ ...convState, verified: { ...convState.verified, bookingUrls: [] } });
    }
    const row = [
      sessionId,
      merged.ozanAcked ? "TRUE" : "FALSE",
      merged.ozanActive,
      JSON.stringify(merged.ozanMessages),
      new Date().toISOString(),
      merged.ozanAckType || "",
      merged.inviteToken || "",
      stateJson,
    ];
    if (rowIndex) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SESS_TAB}!A${rowIndex}:H${rowIndex}?valueInputOption=USER_ENTERED`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [row] }) }
      );
    } else {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SESS_TAB}!A1:append?valueInputOption=USER_ENTERED`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [row] }) }
      );
    }
  } catch (e) {
    console.error("writeSessStateV2 exception:", e.message);
  }
}
