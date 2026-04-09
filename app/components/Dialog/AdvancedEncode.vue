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
import type { Stream } from '~/types/ffmpeg.js'
import type { File } from '~/types/File.js'
import type { SubmitEventPromise } from 'vuetify/framework'

const props = defineProps<{
  file: File
}>()

const model = defineModel<boolean>({
  required: true,
})

const api = useAPI()

const streams = ref<Stream[]>([])
const loading = ref(false)

const audio = ref<number[]>([])
const copyHighestVariant = ref(false)
const customAudioFilter = ref<string>('')
const useCustomAudioFilter = ref(false)
const ss = ref('')

const payload = computed(() => {
  return {
    audio: audio.value,
    copyHighestVariant: copyHighestVariant.value,
    customAudioFilter: customAudioFilter.value,
    ss: ss.value,
  }
})

watch(model, (value) => {
  if (!value) {
    return
  }

  streams.value = []
  audio.value = []
  copyHighestVariant.value = false
  customAudioFilter.value = ''
  useCustomAudioFilter.value = false
  ss.value = ''
})

async function submit(validate: SubmitEventPromise) {
  if (!(await validate).valid) {
    return
  }

  loading.value = true
  await api(`files/${props.file._id}/encode`, {
    method: 'POST',
    body: payload.value,
  })
  loading.value = false
  model.value = false
}
</script>

<template>
  <v-dialog
    v-model="model"
    width="600"
    :persistent="loading"
  >
    <v-card
      :loading="loading"
    >
      <v-form
        validate-on="lazy submit"
        @submit.prevent="submit"
      >
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
