/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // No eslint config is shipped with this project; skip lint during build
    // so `next build` doesn't hang waiting for the interactive setup prompt.
    ignoreDuringBuilds: true
  }
};

module.exports = nextConfig;
