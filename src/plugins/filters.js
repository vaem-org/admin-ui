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

import Vue from 'vue';
import format from 'date-fns/format';
import bytes from 'bytes';
import { basename } from 'path';

Vue.filter('date', value => format(new Date(value), 'dd MMM yyyy, kk:mm:ss'));
Vue.filter('bytes', bytes);
Vue.filter('duration', value => {
  return !isNaN(value) && isFinite(value) ? [
    Math.floor(value / 3600),
    Math.floor(value / 60) % 60,
    Math.floor(value)  % 60
  ].map(value => value < 10 ? `0${value}` : value).join(':') : '-:-:-';
});
Vue.filter('basename', basename);