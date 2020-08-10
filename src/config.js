/*
 * VAEM - Asset manager
 * Copyright (C) 2019  Wouter van de Molengraft
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

const config = {
  apiUrl: process.env.VUE_APP_API_URL || '$VUE_APP_API_URL',
  embedUrl: process.env.VUE_APP_EMBED_URL || '$VUE_APP_EMBED_URL',
  baseUrl: process.env.BASE_URL || '$BASE_URL',
  showExternalId: process.env.VUE_APP_SHOW_EXTERNAL_ID || '$VUE_APP_SHOW_EXTERNAL_ID'
};

Object.keys(config).forEach(key => {
  if (config[key].startsWith('$')) {
    config[key] = null;
  }
});

export default config;
