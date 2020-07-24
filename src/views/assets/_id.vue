<!--
  - VAEM - Asset manager
  - Copyright (C) 2019  Wouter van de Molengraft
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
  <div>
    <v-card flat>
      <v-form @submit.prevent="saveItem">
        <v-card-title>
          <span>{{ item.title }}</span>
        </v-card-title>
        <v-card-text>
          <v-img :src="thumbnail" :aspect-ratio="16/9" v-if="item.state === 'processed'" eager>
            <template v-slot:placeholder>
              <v-row
                class="fill-height ma-0"
                align="center"
                justify="center"
              >
                <v-progress-circular indeterminate color="grey"></v-progress-circular>
              </v-row>
            </template>
          </v-img>
          <v-switch label="Public" v-model="editItem.public"/>
          <v-text-field label="Title" v-model="editItem.title"/>
          <v-combobox label="Labels" v-model="editItem.labels" tags chips deletable-chips :items="labels" multiple autocomplete="off" :search-input.sync="labelsInput" @change="labelsInput=''"/>
          <v-text-field
            v-if="showExternalId"
            label="External id"
            v-model="editItem.externalId"
          />
          <div v-if="!editItem.live">
            <h3>
              Subtitles
              <v-btn icon small @click="uploadSubtitlePopup=true" color="primary"
                     :disabled="availableLanguages.length === 0 || editItem.state !== 'processed'">
                  <v-icon>mdi-plus</v-icon>
              </v-btn>
            </h3>
            <div v-for="language of subtitles" :key="language">
              <button v-if="editItem.subtitles[language] === true" type="button" class="link primary--text" @click="downloadSubtitle(language)">{{ language.toUpperCase() }}</button>
              <span v-else>{{ language.toUpperCase() }}</span>
              <v-btn @click="removeSubtitle(language)" icon><v-icon>mdi-delete</v-icon></v-btn>
            </div>
          </div>
          <div v-else>
            <v-text-field label="Source" v-model="editItem.sourceRTMP"/>
          </div>
          <v-alert v-model="error" dismissible type="error">
            {{ errorMessage }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn @click="cancel" :disabled="uploading || !changed">Cancel</v-btn>
          <v-btn type="submit" color="primary" :loading="uploading" :disabled="!changed">Save</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
    <div v-if="editItem.live" class="mt-5">
      <v-btn :loading="startingLiveStream" :disabled="startingLiveStream" color="red" @click="startLiveStream">Start live stream</v-btn>
    </div>

    <v-dialog v-model="uploadSubtitlePopup" :persistent="uploading" max-width="500px">
      <v-form @submit.prevent="addSubtitle" lazy-validation ref="addSubtitle">
        <v-card>
          <v-card-title>Add subtitle</v-card-title>
          <v-card-text>
            <v-select v-model="uploadLanguage" label="Language" :items="availableLanguages" :rules="[v => !!v || 'Please select a language']"/>
            <v-file-input v-model="uploadFile" label="File" :rules="[v => !!v || 'Please select a file']" accept=".890,.stl,.pac,.srt,.vtt"/>
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn @click="uploadSubtitlePopup=false">Cancel</v-btn>
            <v-btn type="submit" color="primary" :loading="uploading">Add</v-btn>
          </v-card-actions>
        </v-card>
      </v-form>

    </v-dialog>
  </div>
</template>

<script>
  import pick from 'lodash/pick';
  import cloneDeep from 'lodash/cloneDeep';
  import isEqual from 'lodash/isEqual';
  import { basename } from 'path';
  import config from '@/config';
  import { languages } from '@/defaults';

  export default {
    name: 'EditAsset',
    props: {
      labels: Array,
      timestamp: Number
    },
    data: () => ({
      item: {},
      uploadFile: null,
      uploading: false,
      uploadLanguage: null,
      uploadSubtitlePopup: false,
      languages,
      error: false,
      errorMessage: '',
      editItem: {},
      thumbnails: {},
      labelsInput: '',
      showExternalId: process.env.VUE_APP_SHOW_EXTERNAL_ID,
      startingLiveStream: false
    }),
    computed: {
      subtitles() {
        return Object.keys(this.editItem.subtitles || {});
      },
      availableLanguages() {
        return languages.filter(
          language => !this.editItem.subtitles || !this.editItem.subtitles[language]
        );
      },
      changed() {
        return !isEqual(this.item, this.editItem);
      },
      thumbnail() {
        if (this.thumbnails.default) {
          return config.apiUrl + this.thumbnails.default;
        }

        return '';
      }
    },
    watch: {
      async $route(to) {
        if (to.params.id !== this.item.id) {
          await this.update();
        }
      },
      async item(val) {
        this.editItem = cloneDeep(val);

        this.thumbnails = {};
        this.thumbnails = (await this.$axios.get(`/assets/${this.$route.params.id}/thumbnails`)).data;
      },

      timestamp() {
        this.update()
          .catch(e => console.error(e));
      }
    },
    methods: {
      async saveItem() {
        this.uploading = true;
        this.error = false;

        // remove deleted subtitles
        for(let language of Object.keys(this.item.subtitles || {})) {
          if (this.item.subtitles[language] && !this.editItem.subtitles[language]) {
            await this.$axios.delete(`/assets/${this.item._id}/subtitles/${language}`);
          }
        }

        let error = false;
        // upload subtitles
        for(let language of Object.keys(this.editItem.subtitles || {})) {
          if (typeof this.editItem.subtitles[language] !== 'boolean') {
            const file = this.editItem.subtitles[language];
            try {
              await this.axios.put(`/assets/${this.item._id}/subtitles/${language}/${basename(file.name)}`,
                file);
            }
            catch (e) {
              console.error(e);
              error = `Unable to convert subtitle for language '${language}'`;
            }
          }
        }

        if (error) {
          this.uploading = false;
          this.error = true;
          this.errorMessage = error;
          return;
        }

        await this.$axios.post(`/assets/${this.item._id}`, pick(this.editItem, [
          'title',
          'labels',
          'public',
          'externalId',
          'sourceRTMP'
        ]));

        this.$emit('saved');
        this.uploading = false;
        await this.update();
      },

      cancel() {
        this.editItem = cloneDeep(this.item);
      },

      async downloadSubtitle(language) {
        location.href = `${config.apiUrl}/assets/${this.item._id}/subtitles` +
          (await this.$axios.get(`/assets/${this.item._id}/subtitles/${language}`)).data;
      },

      removeSubtitle(language) {
        const subtitles = {...this.editItem.subtitles};
        delete subtitles[language];

        this.$set(this.editItem, 'subtitles', subtitles);
      },

      addSubtitle() {
        if (!this.$refs.addSubtitle.validate()) {
          return;
        }

        this.$set(this.editItem, 'subtitles', {
          ...this.editItem.subtitles,
          [this.uploadLanguage]: this.uploadFile
        });

        this.uploadFile = null;
        this.uploadLanguage = null;
        this.$refs.addSubtitle.resetValidation();
        this.uploadSubtitlePopup = false;
      },

      async update() {
        this.item = (await this.$axios.get(`/assets/${this.$route.params.id}`)).data;
      },

      async startLiveStream() {
        this.startingLiveStream = true;
        try {
          await this.$axios.post(`/encoders/live/${this.$route.params.id}/start`);
        }
        catch (e) {
          this.error = true;
          this.errorMessage = e.toString();
        }
        this.startingLiveStream = false;
      }
    },
    async mounted() {
      this.update()
        .catch(e => console.error(e));
    }
  }
</script>

<style scoped>
  button.link {
    outline: none;
    text-decoration: underline;
  }
</style>
