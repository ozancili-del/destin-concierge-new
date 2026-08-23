// Permanent, same-host migration redirects. Next.js emits HTTP 308 for
// `permanent: true`; Google treats 301 and 308 as equivalent permanent moves.
// Unspecified query parameters are preserved, including OwnerRez booking state.
const { pathRedirects } = require("./redirect-inventory");

const legacyRedirects = pathRedirects.map(([source, destination]) => ({
  source,
  destination,
  permanent: true,
}));

module.exports = { legacyRedirects };
