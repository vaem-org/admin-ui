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

import type { Format, Stream } from '~/types/ffmpeg.js'
import type { Item } from '~/types/Item.js'

export interface Asset extends Item {
  _id: string
  labels: string[]
  title: string
  state: 'new' | 'verified' | 'processed' | 'processing' | 'error'
  ffprobe: {
    streams: Stream[]
    format: Format
  }
  file: string
  public: boolean
  variants: string[]
  uploadVariants: string[]
  job: string | Job
  hls_enc_key: string
  hls_enc_iv: string
  subtitles: Record<string, boolean>
}
