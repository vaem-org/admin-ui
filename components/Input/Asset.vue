<!--
  - VAEM - Asset manager
  - Copyright (C) 2024  Wouter van de Molengraft
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
  <v-autocomplete
    v-model="proxy"
    :items="assets"
    item-text="title"
    item-value="_id"
    :rules="[v => !!v || 'Please select an asset']"
    autocomplete="off"
    :search-input.sync="searchInput"
    :loading="searching"
    chips
    v-bind="$attrs"
    v-on="$listeners"
  />
</template>

<script>
const cache = {}
export default {
  name: 'InputAsset',
  props: {
    value: {
      type: String,
      default: null
    }
  },
  data: () => ({
    searchInput: '',
    searching: false,
    assets: []
  }),
  computed: {
    proxy: {
      get () {
        return this.value
      },

      set (newValue) {
        this.$emit('input', newValue)
        this.searchInput = ''
      }
    }
  },
  watch: {
    async searchInput (value) {
      const result = await this.$axios.$get('/assets', {
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

      const getItem = async (id) => {
        if (!cache[id]) {
          cache[id] = await this.$axios.$get(`/assets/${id}`)
        }

        return cache[id]
      }

      this.assets = [
        ...this.value && result.every(({ _id }) => _id !== this.value)
          ? [await getItem(this.value)]
          : [],
        ...result
      ]
    }
  }
}
</script>
