/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export might be causing loading issues
  // Remove output: 'export' for normal Next.js deployment
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Properly configure images for static or server rendering
  images: { 
    unoptimized: true,
    domains: ['tonapi.io'] 
  },
};

module.exports = nextConfig;
