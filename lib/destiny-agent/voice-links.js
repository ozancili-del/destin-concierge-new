const ALLOWED_HOSTS = Object.freeze([
  "destincondogetaways.com",
  "tripshock.com",
  "discovercars.com",
  "aviasales.com",
]);

function isAllowedHost(hostname) {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some(allowed => host === allowed || host.endsWith(`.${allowed}`));
}

function labelFor(url) {
  const value = `${url.hostname}${url.pathname}`.toLowerCase();
  if (value.includes("unit-707") || value.includes("707-orp")) return "Book Unit 707";
  if (value.includes("unit-1006") || value.includes("1006-orp")) return "Book Unit 1006";
  if (value.includes("restaurant")) return "Open restaurant guide";
  if (value.includes("availability")) return "Check availability";
  if (value.includes("destinweather") || value.includes("beach-cam")) return "View live conditions";
  if (url.hostname.toLowerCase().endsWith("tripshock.com")) return "Explore activities";
  if (url.hostname.toLowerCase().endsWith("discovercars.com")) return "Search rental cars";
  if (url.hostname.toLowerCase().endsWith("aviasales.com")) return "Search flights";
  return "Open helpful link";
}

export function extractVoiceCompanionLinks(text) {
  const matches = String(text || "").match(/https:\/\/[^\s<>()\]]+/gi) || [];
  const seen = new Set();
  const links = [];
  for (const raw of matches) {
    try {
      const url = new URL(raw.replace(/[.,;!?]+$/, ""));
      if (!isAllowedHost(url.hostname) || seen.has(url.href)) continue;
      seen.add(url.href);
      links.push({ href: url.href, label: labelFor(url) });
    } catch {}
  }
  return links;
}

