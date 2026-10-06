/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Aktifkan optimasi gambar Next.js (konversi ke WebP, resize otomatis)
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 hari cache
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Kompres response HTTP
  compress: true,
  // Optimasi bundle khusus VPS / Docker agar sangat ringan
  output: 'standalone',
}

export default nextConfig
