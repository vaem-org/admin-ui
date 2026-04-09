<!--
  - VAEM - Asset manager
  - Copyright (C) 2026  Wouter van de Molengraft
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

<script setup lang="ts">
import type { Asset } from '~/types/Asset.js'

const cache: Record<string, Asset> = {}

const model = defineModel<string | null>({
  required: true,
})

const api = useAPI()

const searchInput = ref('')
const searching = ref(false)
const assets = ref<Asset[]>([])

watchDebounced(searchInput, async (value) => {
  const result = await api<Asset[]>('assets', {
    query: {
      q: value,
      filter: JSON.stringify({
        state: 'verified',
        deleted: {
          $ne: true,
        },
      }),
    },
  })

  const getItem = async (id: string) => {
    if (!cache[id]) {
      cache[id] = await api<Asset>(`/assets/${id}`)
    }

    return cache[id]
  }

  assets.value = [
    ...model.value && result.every(({ _id }) => _id !== model.value)
      ? [await getItem(model.value)]
      : [],
    ...result,
  ]
}, {
  immediate: true,
})
</script>

<template>
  <v-autocomplete
    v-model="model"
    v-model:search-input="searchInput"
    :items="assets"
    item-text="title"
    item-value="_id"
    :rules="[(v: string) => !!v || 'Please select an asset']"
    autocomplete="off"
    :loading="searching"
    chips
    v-bind="$attrs"
  />
</template>
