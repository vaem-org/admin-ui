/*
 * VAEM - Asset manager
 * Copyright (C) 2022  Wouter van de Molengraft
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

import Vue from 'vue'
import dayjs from 'dayjs'
import bytes from 'bytes'

Vue.filter('duration', (value) => {
  return [
    ...value >= 3600 ? [Math.floor(value / 3600)] : [],
    Math.floor(value / 60) % 60,
    Math.floor(value % 60)
  ]
    .map((v, i) => i === 0 ? v : v.toString().padStart(2, '0'))
    .join(':')
})

Vue.filter('date', value => dayjs(value).format('DD MMM YYYY, HH:mm:ss'))
Vue.filter('bytes', bytes)
