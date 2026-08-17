/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_DEPLOYMENT_ENV: process.env.VERCEL_ENV || "development",
  },
  async rewrites() {
    return [
      { source: "/deals", destination: "/beach-deals" },
      { source: "/car-rentals", destination: "/destin-car-rental.html" },
      { source: "/activities", destination: "/destin-tripshock.html" },
    ];
  },
  async redirects() {
    return [
      { source: "/destin-live-beach-cam-574002656", destination: "/beach-cam", permanent: true },
      { source: "/webcam-574002656", destination: "/beach-cam", permanent: true },
      { source: "/aboutus-574000712", destination: "/about", permanent: true },
      { source: "/about-me-574000712", destination: "/about", permanent: true },
      { source: "/aboutme-574000712", destination: "/about", permanent: true },
      { source: "/privacy-574035022", destination: "/privacy", permanent: true },
      { source: "/properties", destination: "/destin-vacation-rentals-by-owner", permanent: true },
      { source: "/pelican-beach-resort-destin-574048693", destination: "/resort", permanent: true },
      { source: "/-pelican-beach-resort-condo-rental-574046950", destination: "/why-book-direct", permanent: true },
      { source: "/pelican-beach-resort-unit-707-orp5b47b5ax", destination: "/condos/unit-707", permanent: true },
      { source: "/pelican-beach-resort-unit-1006-orp5b6450ex", destination: "/condos/unit-1006", permanent: true },
      { source: "/destin-vacation-itinerary-planner-574049367", destination: "/trip-planner", permanent: true },
      { source: "/ai-concierge-574036277", destination: "/destin-ai-concierge", permanent: true },
      { source: "/virtualtour-574001044", destination: "/virtual-tours", permanent: true },
      { source: "/destin-condo-guide-574047967", destination: "/faq", permanent: true },
      { source: "/blog/destin-condo-ai-concierge-direct-booking", destination: "/why-book-direct", permanent: true },
      { source: "/blog/destin-vacation-rental-ai-concierge", destination: "/destin-ai-concierge", permanent: true },
    ];
  },
};
module.exports = nextConfig;
