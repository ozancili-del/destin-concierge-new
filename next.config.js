/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/destin-live-beach-cam-574002656", destination: "/beach-cam", permanent: true },
      { source: "/webcam-574002656", destination: "/beach-cam", permanent: true },
      { source: "/pelican-beach-resort-unit-707-orp5b47b5ax", destination: "/condos/unit-707", permanent: true },
      { source: "/pelican-beach-resort-unit-1006-orp5b6450ex", destination: "/condos/unit-1006", permanent: true },
      { source: "/destin-vacation-itinerary-planner-574049367", destination: "/trip-planner", permanent: true },
    ];
  },
};
module.exports = nextConfig;
