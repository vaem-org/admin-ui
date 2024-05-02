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
                </v-slide-y-transition>
              </div>
            </v-col>
            <v-col class="d-flex flex-column">
              <div
                class="flex-grow-1 overflow-y-auto height"
              >
                <v-simple-table>
                  <thead>
                    <tr>
                      <th>Start</th>
                      <th>End</th>
                      <th>Text</th>
                      <td />
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(cue, i) of modifiedCues"
                      :key="i"
                      :class="{ deleted: deleteLines.includes(i) }"
                      @click="navigate(cue)"
                    >
                      <td>
                        {{ cue.startTime | duration }}
                      </td>
                      <td>
                        {{ cue.endTime | duration }}
                      </td>
                      <td>
                        <pre v-text="cue.text" />
                      </td>
                      <td>
                        <div class="actions">
                          <v-btn
                            v-if="!deleteLines.includes(i)"
                            icon
                            @click.native.prevent="deleteLine(i)"
                          >
                            <v-icon>mdi-delete</v-icon>
                          </v-btn>
                          <v-btn
                            v-else
                            icon
                            @click.native.prevent="undeleteLine(i)"
                          >
                            <v-icon>mdi-undo</v-icon>
                          </v-btn>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </v-simple-table>
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
      delay: 0,
      factor: 1,
      sourceFramerate: 25,
      destinationFramerate: 25,
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
      speedAdjustment: null,
      speedAdjustmentItems: [
        { text: 'None', value: null },
        { text: 'Change framerate', value: 'framerate' },
        { text: 'By a factor', value: 'factor' }
      ],
      deleteLines: []
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

      let factor = 1
      if (this.speedAdjustment === 'framerate') {
        factor = (this.sourceFramerate / this.destinationFramerate)
      } else if (this.speedAdjustment === 'factor') {
        factor = this.factor
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
    webVtt () {
      const serializer = new WebVTTSerializer()
      return serializer.serialize(structuredClone(
        this.modifiedCues
          .filter((_, index) => !this.deleteLines.includes(index))
      ))
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
      if (!this.asset) {
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
    }
  },
  watch: {
    value (value) {
      if (value) {
        this.saving = false
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
    }
  },
  created () {
    this.serializer = new WebVTTSerializer()
  },
  destroyed () {
    delete this.serializer
  },
  methods: {
    navigate (cue) {
      this.$refs.video?.seek?.(cue.startTime)
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
      this.loading = false
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
