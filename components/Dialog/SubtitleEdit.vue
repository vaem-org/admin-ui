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
  <v-dialog
    v-model="proxyValue"
    width="1200"
    :fullscreen="$vuetify.breakpoint.xs"
  >
    <v-card
      :loading="loading"
    >
      <v-form
        ref="form"
        v-model="valid"
        @submit.prevent="save"
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
                  :rules="[v => !!v || 'Please select an asset']"
                />
                <v-responsive
                  :aspect-ratio="16/9"
                  class="mb-5"
                >
                  <vaem-player
                    v-if="stream && proxyValue"
                    ref="video"
                    :src="stream.stream"
                    :text-tracks="textTracks"
                    :aspect-ratio="16/9"
                  />
                </v-responsive>
                <v-text-field
                  v-model="delay"
                  label="Delay (s)"
                  filled
                  type="number"
                />
                <v-select
                  v-model="speedAdjustment"
                  label="Speed adjustment"
                  :items="speedAdjustmentItems"
                  filled
                />
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
                          v-model="manual[index].index"
                          type="number"
                          :label="`Index ${1 + parseInt(index)}`"
                          outlined
                          persistent-hint
                          :hint="cues[manual[index].index] && cues[manual[index].index].text"
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
                  :headers="cueHeaders"
                  :items="modifiedCues"
                  :options.sync="cueOptions"
                  class="cues"
                  hide-default-footer
                  @click:row="navigate"
                >
                  <template #[`item.startTime`]="{ item }">
                    {{ item.startTime | duration }}
                  </template>
                  <template #[`item.endTime`]="{ item }">
                    {{ item.endTime | duration }}
                  </template>
                  <template #[`item.actions`]="{ index }">
                    <v-btn
                      v-if="!deleteLines.includes(index)"
                      icon
                      @click.native.prevent="deleteLine(index)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                    <v-btn
                      v-else
                      icon
                      @click.native.prevent="undeleteLine(index)"
                    >
                      <v-icon>mdi-undo</v-icon>
                    </v-btn>
                  </template>
                </v-data-table>
                <v-toolbar
                  elevation="0"
                  color="transparent"
                >
                  <v-spacer />
                  <span class="mr-10">
                    {{ (cueOptions.page - 1) * cueOptions.itemsPerPage + 1 }}-{{ cueOptions.page * cueOptions.itemsPerPage }} of {{ cues.length }}
                  </span>
                  <v-btn
                    icon
                    small
                    :disabled="cueOptions.page === 1"
                    @click="cueOptions.page = 1"
                  >
                    <v-icon>
                      mdi-page-first
                    </v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    small
                    :disabled="cueOptions.page === 1"
                    @click="cueOptions.page = cueOptions.page - 1"
                  >
                    <v-icon>
                      mdi-chevron-left
                    </v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    small
                    :disabled="cueOptions.page === numPages"
                    @click="cueOptions.page = cueOptions.page + 1"
                  >
                    <v-icon>
                      mdi-chevron-right
                    </v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    small
                    :disabled="cueOptions.page === numPages"
                    @click="cueOptions.page = numPages"
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
            @click="proxyValue = false"
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

<script>
import VaemPlayer from '@vaem/player'
import { WebVTTParser, WebVTTSerializer } from 'webvtt-parser'
import { languages } from 'assets/defaults'
import debounce from 'lodash/debounce'

export default {
  name: 'DialogSubtitleEdit',
  components: {
    VaemPlayer
  },
  props: {
    value: Boolean,
    url: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: null
    },
    asset: {
      type: Object,
      default: null
    },
    initialSettings: {
      type: Object,
      default: () => ({})
    }
  },
  data () {
    return {
      columnStyle: {
        height: '82vh'
      },
      language: languages[0],
      languages,
      assetId: this.asset?._id ?? null,
      stream: null,
      textTrack: null,
      cues: [],
      delay: this.initialSettings.delay ?? 0,
      factor: this.initialSettings.factor ?? 1,
      sourceFramerate: this.initialSettings.sourceFramerate ?? 25,
      destinationFramerate: this.initialSettings.destinationFramerate ?? 25,
      frameRates: [
        23.976,
        24,
        25,
        29.97,
        30
      ],
      valid: false,
      loading: false,
      saving: false,
      speedAdjustment: this.initialSettings.speedAdjustment ?? null,
      speedAdjustmentItems: [
        { text: 'None', value: null },
        { text: 'Change framerate', value: 'framerate' },
        { text: 'By a factor', value: 'factor' },
        { text: 'Manually', value: 'manual' }
      ],
      deleteLines: [],
      manual: [
        {
          index: 0,
          destination: '00:00:00'
        },
        {
          index: 0,
          destination: '00:00:00'
        }
      ],
      webVtt: '',
      cueHeaders: [
        { text: 'Start', value: 'startTime' },
        { text: 'End', value: 'endTime' },
        { text: 'Text', value: 'text' },
        { value: 'actions' }
      ],
      cueOptions: {}
    }
  },
  computed: {
    proxyValue: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    modifiedCues () {
      let delay = parseFloat(this.delay)
      if (Number.isNaN(delay)) {
        delay = 0
      }

      const toSeconds = (value) => {
        let multiplier = 1
        let result = 0
        for (const segment of value.split(':').filter(Boolean).reverse()) {
          result = result + parseInt(segment) * multiplier
          multiplier = multiplier * 60
        }

        return result
      }

      let factor = 1
      if (this.speedAdjustment === 'framerate') {
        factor = (this.sourceFramerate / this.destinationFramerate)
      } else if (this.speedAdjustment === 'factor') {
        factor = this.factor
      } else if (this.speedAdjustment === 'manual') {
        const s1 = this.cues[this.manual[0].index]?.startTime ?? 0
        const s2 = this.cues[this.manual[1].index]?.startTime ?? 1

        const d1 = toSeconds(this.manual[0].destination) || s1
        const d2 = toSeconds(this.manual[1].destination) || s2

        factor = (d1 - d2) / (s1 - s2)
        delay = d1 - s1 * (d1 - d2) / (s1 - s2)
      }

      return this.cues
        .map(({
          startTime,
          endTime,
          ...cue
        }) => {
          return {
            ...cue,
            startTime: startTime * factor + delay,
            endTime: endTime * factor + delay
          }
        })
    },
    textTracks () {
      return [
        {
          src: URL.createObjectURL(new Blob([
            this.webVtt
          ])),
          default: true,
          srclang: 'nl'
        }
      ]
    },

    subtitleUrl () {
      if (!this.asset || this.url) {
        return this.url
      }

      return this.stream?.subtitles?.[this.language]
    },

    availableLanguages () {
      return this.asset
        ? Object.entries(this.asset.subtitles ?? {})
          .filter(([, enabled]) => enabled)
          .map(([language]) => language)
        : languages
    },

    numPages () {
      return Math.ceil(this.cues.length / this.cueOptions.itemsPerPage)
    }
  },
  watch: {
    value (value) {
      if (value) {
        this.saving = false
        this.delay = 0
        this.speedAdjustment = null
        this.factor = 1
        this.sourceFramerate = 25
        this.destinationFramerate = 25
        this.$refs.form?.resetValidation?.()
        this.updateSubtitle()
      }
    },
    asset: {
      async handler () {
        this.stream = this.asset
          ? await this.$axios.$get(`/assets/${this.asset._id}/stream`)
          : null
      },
      immediate: true
    },
    assetId: {
      async handler () {
        this.stream = this.assetId
          ? await this.$axios.$get(`/assets/${this.assetId}/stream`)
          : null
      },
      immediate: true
    },
    subtitleUrl: {
      handler () {
        return this.updateSubtitle()
      },
      immediate: true
    },
    availableLanguages (languages) {
      if (!this.language || !languages.includes(languages)) {
        this.language = languages[0]
      }
    },
    delay () {
      return this.updateSubtitle()
    },
    modifiedCues: debounce(function () {
      this.updateWebVtt()
    }, 500)
  },
  created () {
    this.serializer = new WebVTTSerializer()
  },
  destroyed () {
    delete this.serializer
  },
  methods: {
    navigate (cue) {
      this.$refs.video?.seek?.(Math.max(0, cue.startTime - 2))
    },
    async updateSubtitle () {
      if (!this.subtitleUrl) {
        return
      }

      this.loading = true
      this.cues = []

      // remove <c> nodes
      const cleanup = (nodes) => {
        return nodes.flatMap(({
          children,
          ...node
        }) => node.name === 'c'
          ? children
          : [
              {
                ...node,
                ...children && {
                  children: cleanup(children)
                }
              }
            ])
      }

      const parser = new WebVTTParser()
      try {
        const tree = parser.parse(await this.$axios.$get(this.subtitleUrl))
        this.cues = tree.cues.map(({ text, tree, ...cue }) => ({
          ...cue,
          text: (text ?? '').replace(/<c.*?>|<\/c>/g, ''),
          tree: cleanup([tree])[0]
        }))
      } catch (e) {
        this.$store.commit('flash/setMessage', {
          message: 'An error occurred trying to open subtitle file',
          color: 'error'
        })
      }
      this.manual[1].index = this.cues.length - 1
      this.loading = false
      this.updateWebVtt()
    },
    save () {
      if (!this.valid) {
        return
      }

      this.saving = true

      this.$emit('webvtt', {
        webVtt: this.webVtt,
        assetId: this.asset?._id ?? this.assetId,
        language: this.language
      })
    },
    deleteLine (index) {
      this.deleteLines = [
        ...this.deleteLines,
        index
      ]
    },
    undeleteLine (index) {
      this.deleteLines = this.deleteLines.filter(v => v !== index)
    },
    updateWebVtt () {
      const serializer = new WebVTTSerializer()
      this.webVtt = serializer.serialize(structuredClone(
        this.modifiedCues
          .filter((_, index) => !this.deleteLines.includes(index))
      ))
    }
  }
}
</script>

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
