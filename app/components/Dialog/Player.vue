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
import { VaemPlayer } from '@vaem/player'
import type { StreamInfo } from '~/types/StreamInfo.js'

const props = defineProps<{
  assetId?: string
}>()

const model = defineModel<boolean>({
  required: true,
})

const api = useAPI()

const stream = ref<StreamInfo>()

watch(() => props.assetId, async (value) => {
  stream.value = value ? await api(`assets/${value}/stream`) : undefined
}, {
  immediate: true,
})

const textTracks = computed(() => {
  return Object.entries(stream.value?.subtitles || {}).map(([srclang, src], i) => ({
    src,
    srclang,
    default: i === 0,
  }))
})
</script>

<template>
  <v-dialog
    v-model="model"
    width="600px"
  >
    <vaem-player
      v-if="stream && model"
      :src="stream.stream"
      autoplay
      :text-tracks="textTracks"
      :aspect-ratio="16/9"
    />
  </v-dialog>
</template>
