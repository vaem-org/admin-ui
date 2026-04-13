/*
 * VAEM - Asset manager
 * Copyright (C) 2026  Wouter van de Molengraft
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    'vuetify-nuxt-module',
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],
  ssr: false,
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiUrl: '',
      embedUrl: '',
    },
  },
  experimental: {
    payloadExtraction: 'client',
  },
  compatibilityDate: '2025-07-15',
  vite: {
    optimizeDeps: {
      include: [
        '@date-io/dayjs',
        '@vaem/player',
        'dayjs', // CJS
        'bytes', // CJS
        'json-tree-view-vue3',
        'webvtt-parser', // CJS
        'xlsx',
      ],
    },
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
  vuetify: {
    vuetifyOptions: './vuetify.config.ts',
  },
})
