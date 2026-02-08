/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Turbopack (Next.js 16 default)
  turbopack: {},
  
  // Image configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  
  // TypeScript and ESLint
  typescript: {
    ignoreBuildErrors: false,
  },
  
}

module.exports = nextConfig