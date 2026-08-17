(function initDestinAnalytics(window, document) {
  "use strict";

  if (window.DCGAnalytics) return;

  if (document.documentElement) document.documentElement.dataset.dcgMeasurement = "ready";

  var GA_ID = "G-3SGXCQ4FTC";
  var GTM_ID = "GTM-PQSF8S6D";
  var PRODUCTION_HOSTS = ["destincondogetaways.com", "www.destincondogetaways.com"];
  var FIRST_PARTY_HOSTS = [
    "destincondogetaways.com",
    "www.destincondogetaways.com",
    "deals.destincondogetaways.com",
    "explore.destincondogetaways.com",
    "offer.destincondogetaways.com",
    "sunbirds.destincondogetaways.com"
  ];
  var isProduction = PRODUCTION_HOSTS.indexOf(window.location.hostname) !== -1;
  var dataLayer = window.dataLayer = window.dataLayer || [];
  var recentEvents = Object.create(null);
  var lastPagePath = "";

  function cleanText(value, maxLength) {
    return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, maxLength || 120);
  }

  function cleanParams(params) {
    var safe = {};
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value === undefined || value === null || value === "") return;
      if (/email|phone|name|message|comment|question/i.test(key)) return;
      safe[key] = typeof value === "string" ? cleanText(value, 160) : value;
    });
    return safe;
  }

  function cleanUrl(value) {
    try {
      var url = new URL(value, window.location.origin);
      ["email", "phone", "name", "message", "comment", "question", "first_name", "last_name"].forEach(function (key) {
        url.searchParams.delete(key);
      });
      return url.href;
    } catch (_) {
      return window.location.origin + window.location.pathname;
    }
  }

  function eventKey(name, params) {
    return [name, params && params.item_id, params && params.link_url, window.location.pathname].filter(Boolean).join("|");
  }

  function isDuplicate(name, params, milliseconds) {
    var key = eventKey(name, params);
    var now = Date.now();
    var previous = recentEvents[key] || 0;
    recentEvents[key] = now;
    return now - previous < (milliseconds || 1200);
  }

  function rawGtag() {
    dataLayer.push(arguments);
  }

  function send(name, params, options) {
    var safe = cleanParams(params || {});
    var dedupeMs = options && options.dedupeMs;
    if (isDuplicate(name, safe, dedupeMs)) return false;
    if (document.documentElement) document.documentElement.dataset.dcgLastEvent = name;
    dataLayer.push(Object.assign({ event: name, dcg_event: true }, safe));
    if (isProduction) rawGtag("event", name, safe);
    return true;
  }

  var legacyMap = {
    BookingStarted: "begin_checkout",
    InquirySent: "generate_lead",
    inquiry_sent: "generate_lead",
    book_direct_click: "begin_checkout",
    snowbird_book_click: "begin_checkout",
    find_window_click: "search",
    snowbird_find_rate: "search",
    tile_click: "select_content"
  };

  window.gtag = function gtag() {
    var args = Array.prototype.slice.call(arguments);
    if (isProduction) dataLayer.push(arguments);
    if (args[0] === "event" && legacyMap[args[1]]) {
      send(legacyMap[args[1]], Object.assign({ source_event: args[1] }, args[2] || {}), { dedupeMs: 2500 });
    }
  };

  function loadScript(src, id) {
    if (document.getElementById(id)) return;
    var script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  function pageView() {
    var path = window.location.pathname + window.location.search;
    if (path === lastPagePath) return;
    lastPagePath = path;
    send("page_view", {
      page_title: cleanText(document.title, 160),
      page_location: cleanUrl(window.location.href),
      page_path: path,
      page_environment: isProduction ? "production" : "preview"
    }, { dedupeMs: 500 });
  }

  function identifyPartner(hostname) {
    if (/tripshock\.com$/i.test(hostname)) return "tripshock";
    if (/aviasales\.com$/i.test(hostname)) return "aviasales";
    if (/rentalcars|discovercars|economybookings|qeeq|kayak/i.test(hostname)) return "car_rental";
    if (/airbnb\.com$/i.test(hostname)) return "airbnb";
    if (/vrbo\.com$/i.test(hostname)) return "vrbo";
    return "external";
  }

  function trackLink(anchor) {
    if (!anchor || !anchor.href) return;
    var url;
    try { url = new URL(anchor.href, window.location.href); } catch (_) { return; }
    var label = cleanText(anchor.getAttribute("aria-label") || anchor.textContent, 100);

    if (url.protocol === "tel:" || url.protocol === "mailto:") {
      send("contact", { method: url.protocol === "tel:" ? "phone" : "email", placement: window.location.pathname });
      return;
    }
    var base = { link_url: cleanUrl(url.href), link_text: label };
    if (url.pathname === "/destin-ai-concierge" || url.pathname === "/concierge") {
      send("chat_open", Object.assign(base, { placement: "site_link" }));
      return;
    }
    if (url.pathname === "/availability" || url.pathname === "/book" || url.hash === "#checkout") {
      send("booking_cta_click", Object.assign(base, { destination: url.pathname || window.location.pathname }));
      return;
    }
    if (/^\/condos\/unit-(707|1006)$/.test(url.pathname)) {
      var unit = url.pathname.match(/unit-(707|1006)/)[1];
      send("select_item", Object.assign(base, { item_id: "unit_" + unit, item_name: "Pelican Beach Resort Unit " + unit }));
      return;
    }
    if (url.hostname && url.hostname !== window.location.hostname && FIRST_PARTY_HOSTS.indexOf(url.hostname) === -1) {
      send("affiliate_click", Object.assign(base, { partner: identifyPartner(url.hostname) }));
    }
  }

  function trackAvailabilityForm(form) {
    if (!form || !/\/availability$/.test(form.getAttribute("action") || "")) return;
    var values = new FormData(form);
    var adults = Number(values.get("or_adults") || 0);
    var children = Number(values.get("or_children") || 0);
    send("search", {
      search_term: [values.get("or_arrival"), values.get("or_departure"), adults + children].join("|"),
      search_type: "availability",
      arrival: values.get("or_arrival"),
      departure: values.get("or_departure"),
      adults: adults,
      children: children,
      guests: adults + children
    });
  }

  document.addEventListener("click", function (event) {
    trackLink(event.target && event.target.closest ? event.target.closest("a") : null);
  }, true);
  document.addEventListener("submit", function (event) {
    trackAvailabilityForm(event.target);
  }, true);
  window.addEventListener("dcg:chat_open", function (event) {
    send("chat_open", (event && event.detail) || { placement: "chat_bubble" });
  });
  window.addEventListener("dcg:chat_message", function () {
    send("chat_message_sent", { channel: "destiny_blue" });
  });

  var originalPushState = window.history.pushState;
  var originalReplaceState = window.history.replaceState;
  window.history.pushState = function () {
    originalPushState.apply(window.history, arguments);
    window.setTimeout(pageView, 0);
  };
  window.history.replaceState = function () {
    originalReplaceState.apply(window.history, arguments);
    window.setTimeout(pageView, 0);
  };
  window.addEventListener("popstate", function () { window.setTimeout(pageView, 0); });

  window.DCGAnalytics = {
    track: send,
    pageView: pageView,
    production: isProduction,
    measurementId: GA_ID
  };

  if (isProduction) {
    rawGtag("js", new Date());
    rawGtag("config", GA_ID, {
      send_page_view: false,
      linker: { domains: FIRST_PARTY_HOSTS }
    });
    dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    loadScript("https://www.googletagmanager.com/gtag/js?id=" + GA_ID, "dcg-ga4");
    loadScript("https://www.googletagmanager.com/gtm.js?id=" + GTM_ID, "dcg-gtm");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pageView, { once: true });
  else pageView();
})(
  typeof window !== "undefined" ? window : { DCGAnalytics: true },
  typeof document !== "undefined" ? document : {}
);
