import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // =====================
  // SECURITY HEADERS (Anti-DDoS, XSS, Clickjacking, MIME Sniffing)
  // =====================
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // XSS protection
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy - limit browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=()',
          },
          // Strict Transport Security (HTTPS only)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://*.firebaseio.com https://*.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.googleusercontent.com https://*.googleapis.com https://*.firebasestorage.app https://i.ibb.co https://*.imgbb.com https://i.imgur.com https://*.imgur.com https://*.cloudinary.com https://*.postimg.cc https://images.unsplash.com https://*.imgbox.com",
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://*.cloudfunctions.net",
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, immutable' },
        ],
      },
    ];
  },

  // =====================
  // SEO-FRIENDLY REWRITES: /viec-lam/[slug] → /jobs/[id]
  // =====================
  async rewrites() {
    return [
      // Vietnamese-friendly SEO slugs
      { source: '/viec-lam', destination: '/jobs' },
      { source: '/viec-lam/:slug', destination: '/jobs/:slug' },
      { source: '/bang-vinh-danh', destination: '/vinh-danh' },
      { source: '/huy-hieu-thanh-tuu', destination: '/huy-hieu' },
    ];
  },

  // =====================
  // POWERED-BY HEADER REMOVAL (Security through obscurity)
  // =====================
  poweredByHeader: false,
};

export default nextConfig;
