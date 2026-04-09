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
import type { File } from '~/types/File.js'
import type { Stream } from '~/types/ffmpeg.js'

const props = withDefaults(defineProps<{
  file: File
  label?: string
}>(), {
  label: 'Audio',
})

const api = useAPI()

const streams = ref<Stream[]>([])
const loading = ref(false)

const model = defineModel<number[]>({
  required: true,
})

const audioStreams = computed(() => {
  return streams.value
    .filter(({ codec_type }) => codec_type === 'audio')
    .map(item => ({
      ...item,
      title: `Stream ${item.index} (${[
        `${item.channels} channel${item.channels !== 1 ? 's' : ''}`,
        item.channel_layout,
      ].filter(Boolean).join(', ')})`,
    }))
})

watch(() => props.file, () => {
  return loadStreams()
}, {
  immediate: true,
})

async function loadStreams() {
  loading.value = true
  if (props.file) {
    const response = await api<{
      streams: Stream[]
      audio: number[]
    }>(`/files/${props.file._id}/ffprobe`)
    streams.value = response.streams
    model.value = response.audio
  }
  else {
    streams.value = []
    model.value = []
  }
  loading.value = false
}
</script>

<template>
  <v-select
    v-model="model"
    :label="label"
    :items="audioStreams"
    item-text="text"
    item-value="index"
    chips
    deletable-chips
    multiple
    :loading="loading"
  />
</template>
