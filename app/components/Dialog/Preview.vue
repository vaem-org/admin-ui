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
import Hls from 'hls.js'
import type { SubmitEventPromise } from 'vuetify/framework'
import type { File } from '~/types/File'

const props = defineProps<{
  file?: File
}>()

type Info = { stream: string, uuid: string }

const model = defineModel<boolean>()
const info = ref<Info & { fileId: string }>()
const videoRef = useTemplateRef<HTMLVideoElement>('video')
const audio = ref<number[]>([])
const ss = ref<string>('00:00:00.0')

const api = useAPI()

const hls = new Hls()

async function destroy() {
  if (info.value) {
    await api(`files/${info.value.fileId}/preview/${info.value.uuid}`, {
      method: 'DELETE',
    })
    info.value = undefined
  }
}

onUnmounted(() => {
  hls.destroy()
  return destroy()
})

watch(videoRef, (video) => {
  if (!video) {
    return
  }

  hls.attachMedia(video)
}, {
  immediate: true,
})

watch(model, (value) => {
  if (!value) {
    destroy()
    return
  }

  audio.value = []
})

const submitting = ref(false)

async function submit(validate: SubmitEventPromise) {
  if (!(await validate).valid) {
    return
  }

  submitting.value = true
  info.value = props.file
    ? {
        ...await api<Info>(`files/${props.file._id}/preview`, {
          method: 'POST',
          body: {
            audio: audio.value,
            ss: ss.value,
          },
        }),
        fileId: props.file._id,
      }
    : undefined

  if (info.value?.stream) {
    hls.loadSource(info.value.stream)
    hls.once(Hls.Events.MANIFEST_PARSED, () => {
      videoRef.value?.play?.()
    })
  }
  submitting.value = false
}
</script>

<template>
  <v-dialog
    v-model="model"
    width="720"
    :persistent="!!info"
  >
    <v-card>
      <v-form
        validate-on="lazy submit"
        @submit.prevent="submit"
      >
        <v-card-text>
          <div v-if="file && !info">
            <input-audio-streams
              v-model="audio"
              :file="file"
            />
            <input-time
              v-model="ss"
              label="Start time"
            />
          </div>
          <v-responsive
            v-if="info"
          >
            <video
              ref="video"
              class="fill"
            />
          </v-responsive>
        </v-card-text>
        <v-card-actions
          v-if="!info"
        >
          <v-spacer />
          <v-btn @click="model = false">
            Cancel
          </v-btn>
          <v-btn
            type="submit"
            color="primary"
            :loading="submitting"
            :disabled="submitting"
          >
            Start
          </v-btn>
        </v-card-actions>
        <v-card-actions
          v-else
        >
          <v-spacer />
          <v-btn @click="model = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<style scoped>
video.fill {
  width: 100%;
  height: 100%;
}
</style>
