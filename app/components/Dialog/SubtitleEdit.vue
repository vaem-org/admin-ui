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
import { secondsToString } from '~/assets/secondsToString.js'
import { stringToSeconds } from '~/assets/stringToSeconds.js'

const model = defineModel<boolean>({
  required: true,
})

const props = defineProps<{
  url?: string
  title?: string
  asset?: Asset
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [{
    webVtt: string
    assetId: string
    language: string
  }]
}>()

const api = useAPI()
const snackbarStore = useSnackbarStore()
const { xs } = useDisplay()

const videoRef = useTemplateRef<InstanceType<typeof VaemPlayer>>('video')
const tableRef = useTemplateRef('table')
const language = ref<string | undefined>(languages[0])
const assetId = ref<string | null>(props.asset?._id ?? null)
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
type SpeedAdjustment = 'framerate' | 'factor' | 'manual'
const speedAdjustment = ref<SpeedAdjustment>()
const speedAdjustmentItems: { title: string, value: SpeedAdjustment | null }[] = [
  { title: 'None', value: null },
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
    destination: '00:00:00.00',
  },
  {
    index: 0,
    destination: '00:00:00.00',
  },
])

const webVtt = ref('')
const cueHeaders: DataTableHeader[] = [
  { title: 'Start', value: 'cue.startTime' },
  { title: 'End', value: 'cue.endTime' },
  { title: 'Text', value: 'cue.text' },
  { value: 'actions' },
]

const modifiedCues = computed(() => {
  let _delay = delay.value
  if (Number.isNaN(_delay)) {
    _delay = 0
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

    const d1 = stringToSeconds(manual.value[0].destination) || s1
    const d2 = stringToSeconds(manual.value[1].destination) || s2

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
        startTime: Math.max(0, startTime * _factor + _delay),
        endTime: Math.max(0, endTime * _factor + _delay),
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

watch(model, (value) => {
  if (!value) {
    return
  }

  delay.value = 0
  speedAdjustment.value = undefined
  factor.value = 1
  sourceFramerate.value = 25
  destinationFramerate.value = 25
  updateSubtitle()
}, {
  immediate: true,
})

const selectedAssetId = computed(() => props.asset?._id ?? assetId.value)

watch(selectedAssetId, async (value) => {
  stream.value = value
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
}, {
  immediate: true,
})

watch(delay, () => {
  return updateSubtitle()
})

watchDebounced(modifiedCues, () => {
  updateWebVtt()
}, {
  debounce: 500,
})

function navigate(_event: Event, data: { item: { cue: Cue }, index: number }) {
  const seekTime = Math.max(0, data.item.cue.startTime - 2)
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
    const vtt = await api<Blob>(subtitleUrl.value, {
      redirect: 'follow',
      responseType: 'blob',
    })

    const tree = parser.parse(await vtt.text())
    cues.value = tree.cues.map(({ text, tree, ...cue }, index) => ({
      ...cue,
      id: index.toString(),
      text: (text ?? '').replace(/<c.*?>|<\/c>/g, ''),
      tree: {
        children: cleanup(tree.children),
      },
    }))
  }
  catch (e) {
    console.error(e)
    snackbarStore.setError('An error occurred trying to open subtitle file')
  }

  if (cues.value[0]) {
    manual.value[0].destination = secondsToString(cues.value[0].startTime)
  }

  const lastIndex = cues.value.length - 1
  manual.value[1].destination = secondsToString(cues.value[lastIndex]?.startTime ?? 0)
  manual.value[1].index = lastIndex
  loading.value = false
  updateWebVtt()
}

async function submit(validate: SubmitEventPromise) {
  const assetId1 = props.asset?._id ?? assetId.value

  if (!(await validate).valid || !assetId1) {
    return
  }

  emit('save', {
    webVtt: webVtt.value,
    assetId: assetId1,
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

const currentIndex = ref<number>()
function onTimeUpdate(time: number) {
  if (!videoRef.value || !tableRef.value) {
    return
  }

  const index = modifiedCues.value.findIndex((cue) => {
    return cue.startTime <= time && cue.endTime > time
  })

  if (currentIndex.value !== index) {
    currentIndex.value = index

    if (index !== -1) {
      tableRef.value.scrollToIndex(index, 'center')
    }
  }
}

const rows = computed<{
  cue: Cue
  active: boolean
}[]>(() => modifiedCues.value.map((cue, index) => {
  return {
    cue,
    active: index === currentIndex.value,
  }
}))

function getRowProps({ item }: {
  item: {
    cue: Cue
    active: boolean
  }
}) {
  return {
    class: item.active ? 'active-row' : undefined,
  }
}
</script>

<template>
  <v-dialog
    v-model="model"
    width="1200"
    :fullscreen="xs"
    persistent
  >
    <v-card
      :loading="loading"
    >
      <v-form
        ref="form"
        v-model="valid"
        validate-on="lazy submit"
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
                    @timeupdate="onTimeUpdate"
                  />
                </v-responsive>
                <v-select
                  v-model="speedAdjustment"
                  label="Speed adjustment"
                  :items="speedAdjustmentItems"
                  filled
                />
                <v-slide-y-transition>
                  <v-number-input
                    v-if="speedAdjustment !== 'manual'"
                    v-model="delay"
                    label="Delay (s)"
                    filled
                    type="number"
                    :precision="null"
                  />
                </v-slide-y-transition>
                <v-slide-y-transition>
                  <v-number-input
                    v-if="speedAdjustment === 'factor'"
                    v-model="factor"
                    type="number"
                    label="Factor"
                    filled
                    :precision="null"
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
                      v-for="(item, index) of manual"
                      :key="`manual${index}`"
                    >
                      <v-col>
                        <v-text-field
                          v-model="item.index"
                          type="number"
                          :label="`Index ${1 + index}`"
                          outlined
                          persistent-hint
                          :hint="cues[item.index] && cues[item.index]?.text"
                        />
                      </v-col>
                      <v-col>
                        <input-time
                          v-model="item.destination"
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
                <v-data-table-virtual
                  ref="table"
                  :headers="cueHeaders"
                  :items="rows"
                  class="cues"
                  height="600"
                  fixed-header
                  :row-props="getRowProps"
                  @click:row="navigate"
                >
                  <template #[`item.cue.startTime`]="{ item }">
                    {{ secondsToString(item.cue.startTime) }}
                  </template>
                  <template #[`item.cue.endTime`]="{ item }">
                    {{ secondsToString(item.cue.endTime) }}
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
                </v-data-table-virtual>
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
            :disabled="saving"
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
:deep(.active-row) {
  background-color: #e8f5e920 !important;
}
</style>
