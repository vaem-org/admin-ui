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
    :persistent="loading"
  >
    <v-card
      :loading="loading"
    >
      <v-form @submit.prevent="submit">
        <v-card-text>
          <v-select
            v-model="audio"
            label="Audio"
            :items="audioStreams"
            item-text="text"
            item-value="index"
            chips
            deletable-chips
            multiple
          />
          <v-switch
            v-model="copyHighestVariant"
            label="Copy highest variant"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            type="submit"
            :loading="loading"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'DialogAdvancedEncode',
  props: {
    file: {
      type: Object,
      default: () => null
    },
    value: {
      type: Boolean,
      required: true
    }
  },
  data: () => ({
    streams: [],
    loading: false,
    audio: [],
    copyHighestVariant: false
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
    audioStreams () {
      return this.streams
        .filter(({ codec_type }) => codec_type === 'audio')
        .map(item => ({
          ...item,
          text: `Stream ${item.index} (${[
            `${item.channels} channel${item.channels !== 1 ? 's' : ''}`,
            item.channel_layout
            ].filter(Boolean).join(', ')})`
        }))
    }
  },
  watch: {
    file: {
      handler () {
        return this.loadStreams()
      },
      immediate: true
    }
  },
  methods: {
    async loadStreams () {
      this.loading = true
      if (this.file) {
        const { streams, audio } = await this.$axios.$get(`/files/${this.file._id}/ffprobe`)
        this.streams = streams
        this.audio = audio
      } else {
        this.streams = []
        this.audio = []
      }
      this.loading = false
    },
    async submit () {
      this.loading = true
      await this.$axios.post(`/files/${this.file._id}/encode`, {
        audio: this.audio,
        copyHighestVariant: this.copyHighestVariant
      })
      this.loading = false
      this.$emit('input', false)
    }
  }
}
</script>
