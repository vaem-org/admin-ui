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
import type { SubmitEventPromise } from 'vuetify/framework'
import { languages } from '~/assets/languages.js'
import { downloadBlob } from '~/assets/downloadBlob.js'

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { xs } = useDisplay()
const route = useRoute()
const api = useAPI()
const sign = useSign()

interface Item extends Omit<Asset, 'subtitles'> {
  subtitles: Record<string, string | File>
}

const { data: item } = await useAsyncData<Item | null>(() => `asset-${route.params.id}`, async () => {
  return api<Item>(`assets/${route.params.id}`)
}, {
  default: () => null,
  lazy: true,
  deep: true,
})

const originalItem = ref<string>()

const uploading = ref(false)
const error = ref(false)
const errorMessage = ref('')
const showAddSubtitle = ref(false)
const labels = await api<string[]>('assets/distinct/labels')
const subtitle = ref<{
  language?: string
  file?: File
}>({})
const playerDialog = ref(false)
const thumbnail = ref<string>()
const labelsInput = ref('')

const showPlayer = computed(() => item.value?.state === 'verified')
const changed = computed(() => JSON.stringify(item.value) !== originalItem.value)
const availableLanguages = computed(() => {
  return languages.filter(value => !item.value?.subtitles?.[value])
})

watch(item, () => {
  resetDirty()
  updateThumbnail()
}, {
  immediate: true,
})

function resetDirty() {
  originalItem.value = JSON.stringify(item.value)
}

async function submit(validate: SubmitEventPromise) {
  if (!(await validate).valid || !item.value) {
    return
  }

  uploading.value = true
  error.value = false

  // remove deleted subtitles
  const originalSubtitles = JSON.parse(originalItem.value ?? '{}').subtitles ?? {}
  for (const language of Object.keys(originalSubtitles)) {
    if (originalSubtitles[language] && !item.value.subtitles?.[language]) {
      await api(`assets/${item.value._id}/subtitles/${language}`, {
        method: 'DELETE',
      })
    }
  }

  error.value = false
  // upload subtitles
  for (const [language, file] of Object.entries(item.value.subtitles ?? {})) {
    if (file instanceof File) {
      try {
        await api(`assets/${item.value._id}/subtitles/${language}/${file.name}`, {
          method: 'PUT',
          body: file,
          headers: {
            'content-type': file.type,
          },
        })
      }
      catch (e) {
        console.error(e)
        errorMessage.value = `Unable to convert subtitle for language '${language}'`
      }
    }
  }

  if (error.value) {
    uploading.value = false
    return
  }

  const {
    title,
    labels,
    public: _public,
  } = item.value
  await api(`assets/${item.value._id}`, {
    method: 'PUT',
    body: {
      title,
      labels,
      public: _public,
    },
  })

  emit('saved')
  uploading.value = false
  resetDirty()
}

async function addSubtitle(validate: SubmitEventPromise) {
  if (!item.value
    || !(await validate).valid
    || !subtitle.value.language
    || !subtitle.value.file
  ) {
    return
  }

  item.value.subtitles = {
    ...item.value.subtitles,
    [subtitle.value.language]: subtitle.value.file,
  }
  subtitle.value = {}
  showAddSubtitle.value = false
}

function removeSubtitle(language: string) {
  if (!item.value) {
    return
  }

  item.value.subtitles = Object.fromEntries(
    Object.entries(item.value.subtitles ?? {})
      .filter(([_language]) => _language !== language),
  )
}

async function downloadSubtitle(language: string) {
  if (!item.value) {
    return
  }

  const data = await api<Blob>(`assets/${item.value._id}/subtitles/${language}`, {
    responseType: 'blob',
    query: {
      direct: '1',
    },
  })
  downloadBlob(data, `${item.value.title}.${language}.vtt`)
}

function cancel() {
  item.value = originalItem.value
    ? JSON.parse(originalItem.value)
    : undefined
}

async function updateThumbnail() {
  if (!item.value) {
    thumbnail.value = undefined
    return
  }
  thumbnail.value = await sign(`assets/${item.value._id}/thumbnail/0.png`)
}
</script>

<template>
  <v-card v-if="item">
    <v-toolbar
      v-if="xs"
      dark
      color="primary"
      class="mb-3"
    >
      <v-btn
        icon="mdi-close"
        dark
        size="large"
        @click="emit('close')"
      />
      <v-toolbar-title>{{ item.title }}</v-toolbar-title>
    </v-toolbar>
    <v-card-title
      v-else
    >
      <span>{{ item.title ?? '&nbsp;' }}</span>
    </v-card-title>
    <v-card-text
      :class="{ 'cursor-pointer': showPlayer }"
      @click="playerDialog = true"
    >
      <v-responsive
        :aspect-ratio="16/9"
        class="position-relative"
      >
        <v-img
          v-if="showPlayer"
          :src="thumbnail"
          :aspect-ratio="16/9"
        />
        <v-btn
          v-if="showPlayer"
          icon="mdi-play"
          class="center position-absolute"
        />
      </v-responsive>
    </v-card-text>
    <v-form
      validate-on="lazy submit"
      @submit.prevent="submit"
    >
      <v-card-text>
        <v-switch
          v-model="item.public"
          label="Public"
        />
        <v-text-field
          v-model="item.title"
          label="Title"
        />
        <v-combobox
          v-model="item.labels"
          v-model:search-input="labelsInput"
          label="Labels"
          tags
          chips
          deletable-chips
          :items="labels"
          multiple
          autocomplete="off"
          @change="labelsInput=''"
        />
        <div>
          <h3>
            Subtitles
            <v-btn
              icon="mdi-plus"
              size="small"
              color="primary"
              variant="plain"
              :disabled="availableLanguages.length === 0 || !['processed', 'verified'].includes(item.state)"
              @click="showAddSubtitle = true"
            />
          </h3>
          <div
            v-for="language of Object.keys(item.subtitles || {})"
            :key="language"
          >
            <button
              v-if="item.subtitles[language]"
              type="button"
              class="link primary--text"
              @click="downloadSubtitle(language)"
            >
              {{ language.toUpperCase() }}
            </button>
            <span v-else>{{ language.toUpperCase() }}</span>
            <v-btn
              icon
              @click="removeSubtitle(language)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </div>
        </div>
        <v-alert
          v-model="error"
          dismissible
          type="error"
        >
          {{ errorMessage }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          :disabled="uploading || !changed"
          @click="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          type="submit"
          color="primary"
          :loading="uploading"
          :disabled="!changed"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-form>
    <v-dialog
      v-model="showAddSubtitle"
      width="500px"
    >
      <v-card>
        <v-card-title>Add subtitle</v-card-title>
        <v-form @submit.prevent="addSubtitle">
          <v-card-text>
            <v-select
              v-model="subtitle.language"
              label="Language"
              :items="availableLanguages"
              autofocus
            />
            <v-file-input
              v-model="subtitle.file"
              label="File"
              accept=".890,.stl,.pac,.srt,.vtt"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn type="submit">
              Add
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
    <dialog-player
      v-model="playerDialog"
      :asset-id="item?._id"
    />
  </v-card>
</template>

<style scoped>
.center {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
}

.link {
  appearance: none;
  border: none;
  text-decoration: underline;
}
</style>
