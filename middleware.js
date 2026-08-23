import { NextResponse } from "next/server";

// Quarantined prototypes are intentionally unavailable from the public
// Destin Condo Getaways deployment. Their source remains in the repository so
// each can be rebuilt and deployed independently with its own authentication.
export function middleware(request) {
  if (["/destin-activities", "/destin-car-rentals"].includes(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    if (process.env.VERCEL_ENV !== "production") {
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    return response;
  }

  return new NextResponse(null, {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export const config = {
  matcher: [
    // Canonical static commercial guides are indexable in production, while
    // preview deployments remain protected at the HTTP response layer.
    "/destin-activities",
    "/destin-car-rentals",

    // Retired GuestView / in-room TV prototype.
    "/guestview/:path*",
    "/tv/:path*",
    "/tv-707.html",
    "/tv-1006.html",
    "/api/guestview/:path*",
    "/api/tv-data",
    "/api/tv-recommendations",
    "/api/thermostat",

    // Internal pricing and diagnostic tools. Public deals continue through
    // /deals and its narrowly scoped, read-only deal endpoints.
    "/pricelabs-dashboard.html",
    "/pricing-dashboard-v2.html",
    "/pricing-dashboard-574049826",
    "/api/pricelabs-proxy",
    "/api/pricing-ai",
    "/api/deals-debug",
    "/api/run-agent-regression",

    // Only the guarded /api/destiny-chat router is public. Direct access to
    // experimental or legacy handlers bypasses the storefront API boundary.
    "/api/chat",
    "/api/chat-v2",
    "/api/chat-agent",

    // Owner-only chat prototype. These handlers accepted unvalidated invite
    // tokens and must not share the public storefront security boundary.
    "/ozan",
    "/api/ozan-join",
    "/api/ozan-leave",
    "/api/ozan-poll",
    "/api/ozan-send",

    // OwnerRez/Discord drafting prototype. Re-enable only after signed webhook
    // verification and durable state are implemented in its own deployment.
    "/api/inbox",
  ],
};
