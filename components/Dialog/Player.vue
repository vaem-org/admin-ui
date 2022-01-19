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
    width="600px"
  >
    <vaem-player
      v-if="stream && proxyValue"
      :src="stream.stream"
      autoplay
      :text-tracks="textTracks"
      :aspect-ratio="16/9"
    />
  </v-dialog>
</template>

<script>
import VaemPlayer from '@vaem/player'

export default {
  name: 'DialogPlayer',
  components: {
    VaemPlayer
  },
  props: {
    value: {
      type: Boolean,
      required: true
    },
    assetId: {
      type: String,
      default: null
    }
  },
  data: () => ({
    stream: null
  }),
  async fetch () {
    if (this.assetId) {
      this.stream = await this.$axios.$get(`/assets/${this.assetId}/stream`)
    }
  },
  computed: {
    proxyValue: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    textTracks () {
      return Object.entries(this.stream?.subtitles || {}).map(([srclang, src], i) => ({
        src,
        srclang,
        default: i === 0
      }))
    }
  },
  watch: {
    assetId () {
      this.stream = null
      return this.$fetch()
    }
  }
}
</script>
