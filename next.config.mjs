/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'qzwdlqeicmcaoggdavdm.supabase.co',
        pathname: '/**',
      },
    ],
  },
  // Caching configuration removed - can be re-enabled later
  // async headers() { ... },
  // experimental: { ... },
};

export default nextConfig;
