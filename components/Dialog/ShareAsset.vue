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
      <v-form
        v-if="!shareUrl"
        v-model="formValid"
        @submit.prevent="submit"
      >
        <v-card-text>
          <v-text-field
            v-model="password"
            label="Choose a password"
            :rules="[v => !!v || 'Please enter a password']"
            autofocus
            type="password"
          />
          <v-text-field
            v-model="weeksValid"
            label="Number of weeks valid"
            type="number"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            type="submit"
            :disabled="!formValid"
          >
            Share
          </v-btn>
        </v-card-actions>
      </v-form>
      <div v-else>
        <v-card-text>
          <div class="d-flex align-center">
            <v-text-field
              v-model="shareUrl"
              label="URL"
              readonly
              disabled
              filled
              hide-details
              dense
            />
            <v-btn
              icon
              class="ml-2"
              @click="copy"
            >
              <v-icon>
                mdi-content-copy
              </v-icon>
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="proxyValue=false">
            Close
          </v-btn>
        </v-card-actions>
      </div>
    </v-card>
  </v-dialog>
</template>

<script>
import setClipboard from 'assets/set-clipboard'
import dayjs from 'dayjs'

export default {
  name: 'DialogShareAsset',
  props: {
    value: {
      type: Boolean,
      required: true
    },
    item: {
      type: Object,
      required: true
    }
  },
  data: () => ({
    password: '',
    weeksValid: 2,
    formValid: false,
    shareUrl: ''
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
  watch: {
    value (value) {
      if (value) {
        this.password = ''
        this.weeksValid = 2
        this.shareUrl = ''
      }
    }
  },
  methods: {
    async submit () {
      const { timestamp, signature } = await this.$axios.$post(`/assets/${this.item._id}/share`, {
        password: this.password,
        expires: dayjs().add(this.weeksValid, 'weeks').valueOf()
      })
      this.shareUrl = `${this.$config.embedUrl}/${timestamp}/${signature}/${this.item._id}`
    },
    copy () {
      setClipboard(this.shareUrl)
      this.$store.commit('flash/setMessage', {
        message: 'URL copied'
      })
    }
  }
}
</script>
