import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CareBite: Personalized Hospital Meals',
    short_name: 'CareBite',
    description: 'Hospital meals matched to each patient’s prescribed diet, allergies, preferences and appetite.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF9F7',
    theme_color: '#526B59',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
