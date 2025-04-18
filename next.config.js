/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['example.supabase.co', 'gravatar.com', 'secure.gravatar.com'],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  // Enable experimental RSC features for faster loading
  experimental: {
    // Enable these if needed for new features
    // serverActions: true,
    // ppr: true,
  },

  // Add redirects function
  async redirects() {
    return [
      {
        source: '/provider/provider',
        destination: '/provider/provider/dashboard', // Point to the new dashboard page
        permanent: false, // Use false for temporary redirect during testing, change to true later if desired
      },
    ]
  },
};

module.exports = nextConfig; 