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
    <v-card
      v-if="!previewUrl"
      :loading="loading"
    >
      <v-form @submit.prevent="preview">
        <v-card-text>
          <input-audio-streams
            v-model="audio"
            :file="file"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            type="submit"
            :disabled="loading"
          >
            Preview
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
    <vaem-player
      v-else-if="value"
      :src="previewUrl"
      :aspect-ratio="16/9"
      autoplay
    />
  </v-dialog>
</template>

<script>
import VaemPlayer from '@vaem/player'

export default {
  name: 'DialogPreviewFile',
  components: {
    VaemPlayer
  },
  props: {
    value: {
      type: Boolean,
      required: true
    },
    file: {
      type: Object,
      default: () => null
    }
  },
  data: () => ({
    audio: [],
    previewUrl: '',
    loading: false
  }),
  computed: {
    proxyValue: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    }
  },
  methods: {
    async preview () {
      this.loading = true
      try {
        this.previewUrl = await this.$axios.$post(`/files/${this.file._id}/preview`, {
          audio: this.audio
        })
      } catch (e) {
        console.error(e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
