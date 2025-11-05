/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    unoptimized: false,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
}

export default nextConfig
