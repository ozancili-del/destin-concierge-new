const { legacyRedirects } = require("./config/legacy-redirects");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_DEPLOYMENT_ENV: process.env.VERCEL_ENV || "development",
  },
  async rewrites() {
    return [
      { source: "/destin-condo-deals", destination: "/beach-deals" },
      { source: "/destin-car-rentals", destination: "/destin-car-rental.html" },
      { source: "/destin-activities", destination: "/destin-tripshock.html" },
    ];
  },
  async redirects() {
    return legacyRedirects;
  },
};
module.exports = nextConfig;
