<!--
  - VAEM - Asset manager
  - Copyright (C) 2022  Wouter van de Molengraft
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU General Public License as published by
  - the Free Software Foundation, either version 3 of the License, or
  - (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU General Public License for more details.
  -
  - You should have received a copy of the GNU General Public License
  - along with this program.  If not, see <https://www.gnu.org/licenses/>.
  -->

<template>
  <v-dialog
    v-model="proxyValue"
    width="600"
  >
    <v-card>
      <v-card-title>
        <span>Share <em>{{ item.title }}</em></span>
      </v-card-title>
      <v-card-text>
        <v-switch v-model="controls" label="Controls" />
        <v-switch v-model="autoplay" label="Auto play" />
        <v-switch v-model="muted" label="Muted" />
        <v-switch v-model="loop" label="Loop" />
        <div class="d-flex">
          <v-text-field v-model="embedUrl" label="URL" readonly filled />
          <v-btn small icon class="ma-2" @click="copy(embedUrl)">
            <v-icon>mdi-content-copy</v-icon>
          </v-btn>
        </div>
        <div class="d-flex">
          <v-textarea v-model="embedCode" label="HTML" filled readonly />
          <v-btn small icon class="ma-2" @click="copy(embedCode)">
            <v-icon>mdi-content-copy</v-icon>
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="$emit('input', false)">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { stringify } from 'querystring'
import setClipboard from 'assets/set-clipboard'

export default {
  name: 'DialogEmbedAsset',
  props: {
    item: {
      type: Object,
      required: true
    },
    value: {
      type: Boolean,
      required: true
    }
  },
  data: () => ({
    controls: true,
    autoplay: false,
    muted: false,
    loop: false
  }),
  computed: {
    proxyValue: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    embedUrl () {
      const query = stringify({
        ...this.controls === false ? { controls: 0 } : {},
        ...this.autoplay ? { autoplay: 1 } : {},
        ...this.muted ? { muted: 1 } : {},
        ...this.loop ? { loop: 1 } : {}
      })
      const url = new URL(`${this.$config.embedUrl}/${this.item._id}`)
      url.search = query
      return url.toString()
    },
    embedCode () {
      const { width, height } = this.item
        .ffprobe?.streams?.find?.(({ codec_type }) => codec_type === 'video') || {}

      const iframe = `<iframe src="${this.embedUrl}" frameborder="0"${height !== 0 ? ' style="position:absolute;top:0;left:0;width:100%;height:100%"' : ''}></iframe>`
      if (height) {
        const paddingTop = (height / width * 100) + '%'
        return `<div style="padding-top:${paddingTop};position:relative">${iframe}</div>`
      }
      return iframe
    }
  },
  methods: {
    copy (value) {
      setClipboard(value)
      this.$store.commit('flash/setMessage', {
        message: 'Value copied'
      })
    }
  }
}
</script>
