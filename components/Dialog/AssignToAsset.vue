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
      <v-card-title>
        <span>Assign <strong>{{ name }}</strong> to asset.</span>
      </v-card-title>
      <v-form
        ref="form"
        v-model="valid"
        @submit.prevent="submit"
      >
        <v-card-text>
          <v-autocomplete
            v-model="asset"
            label="Asset"
            :items="assets"
            item-text="title"
            item-value="_id"
            :rules="[v => !!v || 'Please select an asset']"
            autocomplete="off"
            :search-input.sync="searchInput"
            :loading="searching"
            autofocus
          />
          <v-select
            v-model="language"
            label="Language"
            :items="languages"
            class="mt-3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            :loading="loading"
            :disabled="loading || !valid"
            type="submit"
          >
            Assign
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script>
import { languages } from '~/assets/defaults'

export default {
  name: 'DialogAssignToAsset',
  props: {
    value: {
      type: Boolean,
      required: true
    },
    file: {
      type: Object,
      default: () => ({})
    }
  },
  data: () => ({
    asset: null,
    assets: [],

    language: languages[0],
    languages,

    loading: false,
    valid: false,
    searchInput: '',
    searching: false
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
    name () {
      return (this.file?.name ?? '').split('/').slice(-1)[0]
    }
  },
  watch: {
    async searchInput (value) {
      this.assets = await this.$axios.$get('/assets', {
        params: {
          q: value,
          filter: JSON.stringify({
            state: 'verified',
            deleted: {
              $ne: true
            }
          })
        }
      })
    }
  },
  methods: {
    async submit () {
      if (!this.$refs.form.validate()) {
        return
      }

      this.loading = true
      await this.$axios.post(`files/${this.file._id}/assign/${this.asset}/${this.language}`)
      this.loading = false
      this.$emit('input', false)
    }
  }
}
</script>