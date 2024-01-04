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
          <v-switch
            v-model="useCustomAudioFilter"
            label="Use custom audio filter"
          />
          <v-text-field
            v-if="useCustomAudioFilter"
            v-model="customAudioFilter"
            label="Custom audio filter"
            filled
          />
          <input-audio-streams
            v-if="!useCustomAudioFilter"
            v-model="audio"
            :file="file"
          />
          <v-text-field
            v-model="ss"
            label="Start time offset"
            filled
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
    copyHighestVariant: false,
    customAudioFilter: '',
    useCustomAudioFilter: false,
    ss: ''
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
    payload () {
      return {
        audio: this.audio,
        copyHighestVariant: this.copyHighestVariant,
        customAudioFilter: this.customAudioFilter,
        ss: this.ss
      }
    }
  },
  methods: {
    async submit () {
      this.loading = true
      await this.$axios.post(`/files/${this.file._id}/encode`, this.payload)
      this.loading = false
      this.$emit('input', false)
    }
  }
}
</script>
