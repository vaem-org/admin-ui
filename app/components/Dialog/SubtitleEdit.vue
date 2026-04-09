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
import { type Cue, type TreeNode, WebVTTParser, WebVTTSerializer } from 'webvtt-parser'

import type { Asset } from '~/types/Asset.js'
import { languages } from '~/assets/languages.js'
import type { StreamInfo } from '~/types/StreamInfo.js'
import type { DataTableHeader, SubmitEventPromise } from 'vuetify/framework'
import { VTextField } from 'vuetify/components'

const toString = (seconds: number): string => {
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    Math.floor(seconds % 60),
  ]
    .map(v => v.toString().padStart(2, '0'))
    .join(':')
}

const model = defineModel<boolean>({
  required: true,
})

const props = defineProps<{
  url?: string
  title?: string
  asset?: Asset
}>()

const emit = defineEmits<{
  webvtt: [{
    webVtt: string
    assetId: string | undefined
    language: string
  }]
}>()

const api = useAPI()
const snackbarStore = useSnackbarStore()
const { xs } = useDisplay()

const videoRef = useTemplateRef<InstanceType<typeof VaemPlayer>>('video')
const manualIndexRefs = useTemplateRefsList<InstanceType<typeof VTextField>>()
const language = ref<string | undefined>(languages[0])
const assetId = props.asset?._id
const stream = ref<StreamInfo>()
const cues = ref<Cue[]>([])
const delay = ref<number>(0)
const factor = ref<number>(1)
const sourceFramerate = ref<number>(25)
const destinationFramerate = ref<number>(25)
const frameRates = [
  23.976,
  24,
  25,
  29.97,
  30,
]
const valid = ref(false)
const loading = ref(false)
const saving = ref(false)
type SpeedAdjustment = 'framerate' | 'factor' | 'manual'
const speedAdjustment = ref<SpeedAdjustment>()
const speedAdjustmentItems: { title: string, value: SpeedAdjustment | undefined }[] = [
  { title: 'None', value: undefined },
  { title: 'Change framerate', value: 'framerate' },
  { title: 'By a factor', value: 'factor' },
  { title: 'Manually', value: 'manual' },
]

const deleteLines = ref<number[]>([])
type ManualItem = {
  index: number
  destination: string
}
const manual = ref<[ManualItem, ManualItem]>([
  {
    index: 0,
    destination: '00:00:00',
  },
  {
    index: 0,
    destination: '00:00:00',
  },
])

const webVtt = ref('')
const cueHeaders: DataTableHeader[] = [
  { title: 'Start', value: 'startTime' },
  { title: 'End', value: 'endTime' },
  { title: 'Text', value: 'text' },
  { value: 'actions' },
]

const manualFocus = ref<{
  index: 0 | 1
}>()

const modifiedCues = computed(() => {
  let _delay = delay.value
  if (Number.isNaN(_delay)) {
    _delay = 0
  }

  const toSeconds = (value: string): number => {
    let multiplier = 1
    let result = 0
    for (const segment of value.split(':').filter(Boolean).reverse()) {
      result = result + parseInt(segment) * multiplier
      multiplier = multiplier * 60
    }

    return result
  }

  let _factor = 1
  if (speedAdjustment.value === 'framerate') {
    _factor = (sourceFramerate.value / destinationFramerate.value)
  }
  else if (speedAdjustment.value === 'factor') {
    _factor = factor.value
  }
  else if (speedAdjustment.value === 'manual') {
    const s1 = cues.value[manual.value[0].index]?.startTime ?? 0
    const s2 = cues.value[manual.value[1].index]?.startTime ?? 1

    const d1 = toSeconds(manual.value[0].destination) || s1
    const d2 = toSeconds(manual.value[1].destination) || s2

    _factor = (d1 - d2) / (s1 - s2)
    _delay = d1 - s1 * (d1 - d2) / (s1 - s2)
  }

  return cues.value
    .map(({
      startTime,
      endTime,
      ...cue
    }) => {
      return {
        ...cue,
        startTime: startTime * _factor + _delay,
        endTime: endTime * _factor + _delay,
      }
    })
})

const textTracks = computed(() => {
  return [
    {
      src: URL.createObjectURL(new Blob([
        webVtt.value,
      ])),
      default: true,
      srclang: 'nl',
    },
  ]
})

const subtitleUrl = computed(() => {
  if (!props.asset || props.url) {
    return props.url
  }

  return language.value
    ? stream.value?.subtitles?.[language.value]
    : undefined
})

const availableLanguages = computed(() => {
  return props.asset
    ? Object.entries(props.asset.subtitles ?? {})
        .filter(([, enabled]) => enabled)
        .map(([language]) => language)
    : languages
})

const page = ref(1)
const itemsPerPage = ref(10)

const numPages = computed(() => Math.ceil(cues.value.length / itemsPerPage.value))

watch(model, (value) => {
  if (!value) {
    return
  }

  saving.value = false
  delay.value = 0
  speedAdjustment.value = undefined
  factor.value = 1
  sourceFramerate.value = 25
  destinationFramerate.value = 25
  updateSubtitle()
})

watch(() => props.asset, async () => {
  stream.value = props.asset
    ? await api<StreamInfo>(`assets/${props.asset._id}/stream`)
    : undefined
}, {
  immediate: true,
})

watch(() => assetId, async (value) => {
  stream.value = assetId
    ? await api<StreamInfo>(`assets/${value}/stream`)
    : undefined
}, {
  immediate: true,
})

watch(subtitleUrl, () => {
  return updateSubtitle()
}, {
  immediate: true,
})

watch(availableLanguages, (languages) => {
  if (!language.value || !languages.includes(language.value)) {
    language.value = languages[0]
  }
})

watch(delay, () => {
  return updateSubtitle()
})

watchDebounced(modifiedCues, () => {
  updateWebVtt()
}, {
  debounce: 500,
})

function navigate(_event: Event, data: { item: VTTCue, index: number }) {
  if (manualFocus.value) {
    const { index } = manualFocus.value
    manual.value[index].index = data.index + (page.value - 1) * itemsPerPage.value
    manual.value[index].destination = toString(modifiedCues.value[data.index]?.startTime ?? 0)
    setTimeout(() => {
      manualIndexRefs.value[index]?.focus?.()
    }, 100)
    return
  }
  const seekTime = Math.max(0, data.item.startTime - 2)
  videoRef.value?.seek?.(seekTime)
}

async function updateSubtitle() {
  if (!subtitleUrl.value) {
    return
  }

  loading.value = true
  cues.value = []

  // remove <c> nodes
  const cleanup = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.flatMap(node => node.type === 'object' && node.name === 'c'
      ? node.children
      : [
          {
            ...node,
            ...(node.type === 'object' && node.name !== 'ruby')
              ? {
                  children: cleanup(node.children),
                }
              : {},
          } satisfies TreeNode,
        ])
  }

  const parser = new WebVTTParser()
  try {
    const tree = parser.parse(await $fetch(subtitleUrl.value))
    cues.value = tree.cues.map(({ text, tree, ...cue }, index) => ({
      ...cue,
      id: index.toString(),
      text: (text ?? '').replace(/<c.*?>|<\/c>/g, ''),
      tree: {
        children: cleanup(tree.children),
      },
    }))
  }
  catch (_e) {
    snackbarStore.setError('An error occurred trying to open subtitle file')
  }

  if (cues.value[0]) {
    manual.value[0].destination = toString(cues.value[0].startTime)
  }

  const lastIndex = cues.value.length - 1
  manual.value[1].destination = toString(cues.value[lastIndex]?.startTime ?? 0)
  manual.value[1].index = lastIndex
  loading.value = false
  updateWebVtt()
}

async function submit(validate: SubmitEventPromise) {
  if (!(await validate).valid) {
    return
  }

  saving.value = true

  emit('webvtt', {
    webVtt: webVtt.value,
    assetId: props.asset?._id ?? assetId,
    language: language.value ?? 'en',
  })
}

function deleteLine(index: number) {
  deleteLines.value = [
    ...deleteLines.value,
    index,
  ]
}

function undeleteLine(index: number) {
  deleteLines.value = deleteLines.value.filter(v => v !== index)
}

function updateWebVtt() {
  const serializer = new WebVTTSerializer()
  webVtt.value = serializer.serialize(modifiedCues.value
    .filter((_, index) => !deleteLines.value.includes(index)),
  )
}

function resetFocus() {
  setTimeout(() => {
    manualFocus.value = undefined
  }, 100)
}
</script>

<template>
  <v-dialog
    v-model="model"
    width="1200"
    :fullscreen="xs"
  >
    <v-card
      :loading="loading"
    >
      <v-form
        ref="form"
        v-model="valid"
        @submit.prevent="submit"
      >
        <v-card-title>
          Edit subtitle
          <span
            v-if="title"
          >
            "{{ title }}"
          </span>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col>
              <div
                class="flex-grow-1 overflow-y-auto overflow-x-hidden height"
              >
                <v-select
                  v-if="availableLanguages.length > 1"
                  v-model="language"
                  :items="availableLanguages"
                  label="Language"
                  filled
                  autofocus
                />
                <input-asset
                  v-if="!asset"
                  v-model="assetId"
                  filled
                  label="Asset"
                  :rules="[(v: string) => !!v || 'Please select an asset']"
                />
                <v-responsive
                  :aspect-ratio="16/9"
                  class="mb-5"
                >
                  <vaem-player
                    v-if="stream && model"
                    ref="video"
                    :src="stream.stream"
                    :text-tracks="textTracks"
                    :aspect-ratio="16/9"
                  />
                </v-responsive>
                <v-select
                  v-model="speedAdjustment"
                  label="Speed adjustment"
                  :items="speedAdjustmentItems"
                  filled
                />
                <v-slide-y-transition>
                  <v-text-field
                    v-if="speedAdjustment !== 'manual'"
                    v-model="delay"
                    label="Delay (s)"
                    filled
                    type="number"
                  />
                </v-slide-y-transition>
                <v-slide-y-transition>
                  <v-text-field
                    v-if="speedAdjustment === 'factor'"
                    v-model="factor"
                    type="number"
                    label="Factor"
                    filled
                  />
                  <v-row v-else-if="speedAdjustment === 'framerate'">
                    <v-col>
                      <v-select
                        v-model="sourceFramerate"
                        :items="frameRates"
                        label="Source"
                        filled
                      />
                    </v-col>
                    <v-col>
                      <v-select
                        v-model="destinationFramerate"
                        :items="frameRates"
                        label="Destination"
                        filled
                      />
                    </v-col>
                  </v-row>
                  <div v-else-if="speedAdjustment === 'manual'">
                    <v-row
                      v-for="index of Object.keys(manual)"
                      :key="`manual${index}`"
                    >
                      <v-col>
                        <v-text-field
                          :ref="manualIndexRefs.set"
                          v-model="manual[index].index"
                          type="number"
                          :label="`Index ${1 + parseInt(index)}`"
                          outlined
                          persistent-hint
                          :hint="cues[manual[index].index] && cues[manual[index].index].text"
                          @focus="manualFocus = index"
                          @blur="resetFocus"
                        />
                      </v-col>
                      <v-col>
                        <input-time
                          v-model="manual[index].destination"
                          label="Time"
                          outlined
                        />
                      </v-col>
                    </v-row>
                  </div>
                </v-slide-y-transition>
              </div>
            </v-col>
            <v-col class="d-flex flex-column">
              <div
                class="flex-grow-1 overflow-y-auto height"
              >
                <v-data-table
                  v-model:items-per-page="itemsPerPage"
                  v-model:page="page"
                  :headers="cueHeaders"
                  :items="modifiedCues"
                  class="cues"
                  hide-default-footer
                  @click:row="navigate"
                >
                  <template #[`item.startTime`]="{ item }">
                    {{ toString(item.startTime) }}
                  </template>
                  <template #[`item.endTime`]="{ item }">
                    {{ toString(item.endTime) }}
                  </template>
                  <template #[`item.actions`]="{ index }">
                    <div class="actions">
                      <v-btn
                        v-if="!deleteLines.includes(index)"
                        icon="mdi-delete"
                        variant="plain"
                        @click.prevent="deleteLine(index)"
                      />
                      <v-btn
                        v-else
                        icon="mdi-undo"
                        variant="plain"
                        @click.prevent="undeleteLine(index)"
                      />
                    </div>
                  </template>
                </v-data-table>
                <v-toolbar
                  elevation="0"
                  color="transparent"
                >
                  <v-spacer />
                  <span class="mr-10">
                    {{ (page - 1) * itemsPerPage + 1 }}-{{ page * itemsPerPage }} of {{ cues.length }}
                  </span>
                  <v-btn
                    icon
                    small
                    :disabled="page === 1"
                    @click="page = 1"
                  >
                    <v-icon>
                      mdi-page-first
                    </v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    small
                    :disabled="page === 1"
                    @click="page = page - 1"
                  >
                    <v-icon>
                      mdi-chevron-left
                    </v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    small
                    :disabled="page === numPages"
                    @click="page = page + 1"
                  >
                    <v-icon>
                      mdi-chevron-right
                    </v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    small
                    :disabled="page === numPages"
                    @click="page = numPages"
                  >
                    <v-icon>
                      mdi-page-last
                    </v-icon>
                  </v-btn>
                </v-toolbar>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            type="button"
            @click="model = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            type="submit"
            :loading="saving"
            :disabled="saving || !valid"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.height {
  height: 76vh;
}

.actions {
  opacity: 0;
  transition: opacity 0.2s;
}

tr:hover .actions {
  opacity: 1;
}

tr.deleted td,
tr.deleted th {
  text-decoration: line-through;
}
</style>
