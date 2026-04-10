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

const props = defineProps<{
  item: Asset
}>()

const model = defineModel<boolean>({
  required: true,
})

const config = useRuntimeConfig().public
const snackbarStore = useSnackbarStore()

const controls = ref(true)
const autoplay = ref(false)
const muted = ref(false)
const loop = ref(false)

const embedUrl = computed(() => {
  const query = new URLSearchParams({
    ...!controls.value ? { controls: '0' } : {},
    ...autoplay.value ? { autoplay: '1' } : {},
    ...muted.value ? { muted: '1' } : {},
    ...loop.value ? { loop: '1' } : {},
  }).toString()

  const url = new URL(`${config.embedUrl.replace(/\/$/, '')}/${props.item._id}`)
  url.search = query
  return url.toString()
})

const embedCode = computed(() => {
  const { width, height } = props.item
    .ffprobe?.streams?.find?.(({ codec_type }) => codec_type === 'video') || {}

  if (!width || !height) {
    return ''
  }

  const iframe = `<iframe src="${embedUrl.value}" frameborder="0"${height !== 0 ? ' style="position:absolute;top:0;left:0;width:100%;height:100%"' : ''}></iframe>`
  if (height) {
    const paddingTop = (height / width * 100) + '%'
    return `<div style="padding-top:${paddingTop};position:relative">${iframe}</div>`
  }
  return iframe
})

watch(model, (value) => {
  if (!value) {
    return
  }

  controls.value = true
  autoplay.value = false
  muted.value = false
  loop.value = false
})

const { copy, copied } = useClipboard()

watch(copied, (value) => {
  if (!value) {
    return
  }

  snackbarStore.setInfo('Value copied')
})
</script>

<template>
  <v-dialog
    v-model="model"
    width="600"
  >
    <v-card>
      <v-card-title>
        <span>Embed <em>{{ item.title }}</em></span>
      </v-card-title>
      <v-card-text>
        <v-switch
          v-model="controls"
          label="Controls"
        />
        <v-switch
          v-model="autoplay"
          label="Auto play"
        />
        <v-switch
          v-model="muted"
          label="Muted"
        />
        <v-switch
          v-model="loop"
          label="Loop"
        />
        <div class="d-flex">
          <v-text-field
            v-model="embedUrl"
            label="URL"
            readonly
            filled
          />
          <v-btn
            small
            icon
            class="ma-2"
            @click="copy(embedUrl)"
          >
            <v-icon>mdi-content-copy</v-icon>
          </v-btn>
        </div>
        <div class="d-flex">
          <v-textarea
            v-model="embedCode"
            label="HTML"
            filled
            readonly
          />
          <v-btn
            small
            icon="mdi-content-copy"
            class="ma-2"
            @click="copy(embedCode)"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="model = false">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
