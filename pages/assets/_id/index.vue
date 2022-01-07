<!--
  - VAEM - Asset manager
  - Copyright (C) 2022  Wouter van de Molengraft
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
  <v-card>
    <v-toolbar
      v-if="$vuetify.breakpoint.xsOnly"
      dark
      color="primary"
      class="mb-3"
    >
      <v-btn
        icon
        dark
        large
        @click="$emit('close')"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <v-toolbar-title>{{ item.title }}</v-toolbar-title>
    </v-toolbar>
    <v-card-title
      v-else
    >
      <span>{{ item.title || '&nbsp;' }}</span>
    </v-card-title>
    <v-card-text
      :class="{ pointer: showPlayer }"
      @click="playerDialog = true"
    >
      <v-responsive
        :aspect-ratio="16/9"
      >
        <v-img
          v-if="showPlayer"
          :src="thumbnail"
          :aspect-ratio="16/9"
        />
        <v-btn
          v-if="showPlayer"
          icon
          absolute
          class="center"
        >
          <v-icon
            dark
            x-large
          >
            mdi-play
          </v-icon>
        </v-btn>
      </v-responsive>
    </v-card-text>
    <v-form @submit.prevent="saveItem">
      <v-card-text>
        <v-switch v-model="item.public" label="Public" />
        <v-text-field v-model="item.title" label="Title" />
        <v-combobox
          v-model="item.labels"
          label="Labels"
          tags
          chips
          deletable-chips
          :items="labels"
          multiple
          autocomplete="off"
          :search-input.sync="labelsInput"
          @change="labelsInput=''"
        />
        <div>
          <h3>
            Subtitles
            <v-btn
              icon
              small
              color="primary"
              :disabled="availableLanguages.length === 0 || !['processed', 'verified'].includes(item.state)"
              @click="showAddSubtitle=true"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </h3>
          <div v-for="language of Object.keys(item.subtitles || {})" :key="language">
            <button
              v-if="item.subtitles[language] === true"
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
        <v-alert v-model="error" dismissible type="error">
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
            />
            <v-file-input
              v-model="subtitle.file"
              label="File"
              accept=".890,.stl,.pac,.srt,.vtt"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="addSubtitle">
              Add
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
    <dialog-player
      v-model="playerDialog"
      :asset-id="source && source._id"
    />
  </v-card>
</template>

<script>
import { languages } from 'assets/defaults'

export default {
  props: {
    source: {
      type: Object,
      default: () => null
    }
  },
  data () {
    const originalItem = this.source ? JSON.stringify(this.source) : ''
    return {
      uploading: false,
      labelsInput: '',
      error: false,
      errorMessage: '',
      labels: [],
      showAddSubtitle: false,
      subtitle: {},
      playerDialog: false,
      thumbnail: '',
      stream: '',
      item: originalItem ? JSON.parse(originalItem) : {},
      originalItem
    }
  },
  head () {
    return {
      title: this.item?.title
    }
  },
  computed: {
    availableLanguages () {
      return languages.filter(
        language => !this.item.subtitles || !this.item.subtitles[language]
      )
    },
    changed () {
      return JSON.stringify(this.item) !== this.originalItem
    },
    showPlayer () {
      return this.item.state === 'verified'
    }
  },
  watch: {
    async $route (to) {
      if (to.params.id !== this.source?.id) {
        await this.update()
      }
    },
    source: {
      handler (value) {
        this.originalItem = JSON.stringify(value)
        this.item = JSON.parse(this.originalItem) ?? {}
        return this.update()
      },
      immediate: true
    }
  },
  mounted () {
    return this.update()
  },
  methods: {
    async update () {
      if (!this.source) {
        this.item = await this.$axios.$get(`assets/${this.$route.params.id}`)
        this.originalItem = JSON.stringify(this.item)
      }
      this.labels = await this.$axios.$get('assets/distinct/labels')
      this.thumbnail = await this.$sign(`/assets/${this.$route.params.id}/thumbnail/0.png`)
    },

    async saveItem () {
      this.uploading = true
      this.error = false

      // remove deleted subtitles
      const originalSubtitles = JSON.parse(this.originalItem).subtitles ?? {}
      for (const language of Object.keys(originalSubtitles)) {
        if (originalSubtitles[language] && !this.item.subtitles?.[language]) {
          await this.$axios.delete(`/assets/${this.item._id}/subtitles/${language}`)
        }
      }

      let error = false
      // upload subtitles
      for (const [language, file] of Object.entries(this.item.subtitles || {})) {
        if (typeof file !== 'boolean') {
          try {
            await this.$axios.put(`/assets/${this.item._id}/subtitles/${language}/${file.name}`,
              file, {
                headers: {
                  'content-type': file.type
                }
              })
          } catch (e) {
            error = `Unable to convert subtitle for language '${language}'`
          }
        }
      }

      if (error) {
        this.uploading = false
        this.error = true
        this.errorMessage = error
        return
      }

      const {
        title,
        labels,
        public: _public
      } = this.item
      await this.$axios.put(`/assets/${this.item._id}`, {
        title,
        labels,
        public: _public
      })

      this.$emit('saved')
      this.uploading = false
    },
    addSubtitle () {
      this.$set(this.item, 'subtitles', {
        ...this.item.subtitles,
        [this.subtitle.language]: this.subtitle.file
      })
      this.subtitle = {}
      this.showAddSubtitle = false
    },
    removeSubtitle (language) {
      const subtitles = { ...this.item.subtitles }
      delete subtitles[language]
      this.$set(this.item, 'subtitles', subtitles)
    },
    async downloadSubtitle (language) {
      location.href = await this.$sign(`/assets/${this.item._id}/subtitles/${language}`)
    },
    cancel () {
      this.item = JSON.parse(this.originalItem)
    }
  }
}
</script>

<style scoped>
.center {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
}

.pointer {
  cursor: pointer;
}

.link {
  text-decoration: underline;
}
</style>
