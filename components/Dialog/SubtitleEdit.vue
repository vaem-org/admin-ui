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
    <v-card>
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
                  v-model="language"
                  :items="languages"
                  label="Language"
                  filled
                  autofocus
                />
                <input-asset
                  v-model="assetId"
                  filled
                  label="Asset"
                  :rules="[v => !!v || 'Please select an asset']"
                />
                <v-responsive
                  :aspect-ratio="16/9"
                >
                  <vaem-player
                    v-if="stream"
                    ref="video"
                    :src="stream.stream"
                    :text-tracks="textTracks"
                    :aspect-ratio="16/9"
                  />
                </v-responsive>
                <v-checkbox
                  v-model="changeFramerate"
                  label="Change framerate"
                />
                <v-slide-y-transition>
                  <v-row v-if="changeFramerate">
                    <v-col>
                      <v-select
                        v-model="sourceFramerate"
                        :items="frameRates"
                        label="Source"
                        filled
                        :disabled="!changeFramerate"
                      />
                    </v-col>
                    <v-col>
                      <v-select
                        v-model="destinationFramerate"
                        :items="frameRates"
                        label="Destination"
                        filled
                        :disabled="!changeFramerate"
                      />
                    </v-col>
                  </v-row>
                </v-slide-y-transition>
                <v-text-field
                  v-model="delay"
                  label="Delay (s)"
                  filled
                  type="number"
                />
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
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(cue, i) of modifiedCues"
                      :key="i"
                      @click="navigate(cue)"
                    >
                      <td>
                        {{ cue.startTime | duration }}
                      </td>
                      <td>
                        {{ cue.endTime | duration }}
                      </td>
                      <td>
                        {{ cue.text }}
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
    subtitleUrl: {
      type: String,
      default: null
    },
    title: String
  },
  data: () => ({
    columnStyle: {
      height: '82vh'
    },
    language: languages[0],
    languages,
    assetId: null,
    stream: null,
    textTrack: null,
    cues: [],
    delay: 0,
    speed: 1,
    sourceFramerate: 25,
    destinationFramerate: 25,
    changeFramerate: false,
    frameRates: [
      23.976,
      24,
      25,
      29.97,
      30
    ],
    valid: false
  }),
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

      const speed = this.changeFramerate
        ? (this.sourceFramerate / this.destinationFramerate)
        : 1

      return this.cues
        .map(({
          startTime,
          endTime,
          ...cue
        }) => {
          return {
            ...cue,
            startTime: startTime * speed + delay,
            endTime: endTime * speed + delay
          }
        })
    },
    webVtt () {
      const serializer = new WebVTTSerializer()
      return serializer.serialize(structuredClone(this.modifiedCues))
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
    }
  },
  watch: {
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
      this.cues = []
      if (!this.subtitleUrl) {
        return
      }

      const parser = new WebVTTParser()
      const tree = parser.parse(await this.$axios.$get(this.subtitleUrl))
      this.cues = tree.cues
    },
    save () {
      if (!this.valid) {
        return
      }

      this.$emit('webvtt', {
        webVtt: this.webVtt,
        assetId: this.assetId,
        language: this.language
      })
    }
  }
}
</script>

<style scoped>
.height {
  height: 76vh;
}
</style>
