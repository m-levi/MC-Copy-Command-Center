import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Email Copywriter AI',
    short_name: 'Command Center',
    description: 'AI-powered email copywriting and campaign planning workspace',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1020',
    theme_color: '#2563eb',
    orientation: 'portrait',
    icons: [
      {
        src: '/pwa-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/pwa-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/pwa-maskable.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}

