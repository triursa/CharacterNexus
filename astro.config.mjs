import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  site: 'https://triursa.github.io/CharacterNexus/',
  base: '/CharacterNexus/',
  output: 'static'
});
