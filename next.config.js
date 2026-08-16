/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/destin-live-beach-cam-574002656", destination: "/beach-cam", permanent: true },
      { source: "/webcam-574002656", destination: "/beach-cam", permanent: true },
    ];
  },
};
module.exports = nextConfig;
