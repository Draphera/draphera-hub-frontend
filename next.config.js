const apiUrl = process.env.NEXT_PUBLIC_API_URL;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { domains: [] },
  async rewrites() {
    if (!apiUrl) return [];
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
