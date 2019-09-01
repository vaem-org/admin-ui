<template>
  <div>
    <v-card flat>
      <v-form @submit.prevent="saveItem">
        <v-card-title>
          <span>{{ item.title }}</span>
        </v-card-title>
        <v-card-text>
          <v-switch label="Public" v-model="editItem.public"/>
          <v-text-field label="Title" v-model="editItem.title"/>
          <v-combobox label="Labels" v-model="editItem.labels" tags chips deletable-chips :items="labels" multiple autocomplete="off"/>
          <div>
            <h3>
              Subtitles
              <v-btn icon small @click="uploadSubtitlePopup=true" color="primary"
                     :disabled="availableLanguages.length === 0 || editItem.state !== 'processed'">
                  <v-icon>mdi-plus</v-icon>
              </v-btn>
            </h3>
            <div v-for="language of subtitles" :key="language">
              <a :href="downloadSubtitleUrl(language)">{{ language.toUpperCase() }}</a>
              <v-btn @click="removeSubtitle(language)" icon><v-icon>mdi-delete</v-icon></v-btn>
            </div>
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
      item: Object,
      labels: Array
    },
    data: () => ({
      uploadFile: null,
      uploading: false,
      uploadLanguage: null,
      uploadSubtitlePopup: false,
      languages,
      error: false,
      errorMessage: '',
      editItem: {}
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
      }
    },
    watch: {
      item(item) {
        this.editItem = cloneDeep(item);
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
        for(let language of Object.keys(this.editItem.subtitles)) {
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
          'public'
        ]));

        this.$emit('saved');
        this.uploading = false;
      },

      cancel() {
        this.editItem = cloneDeep(this.item);
      },

      downloadSubtitleUrl(language) {
        const base = `${config.apiUrl}/assets/${this.item._id}/`;
        const query = `?token=${encodeURIComponent(localStorage.getItem('token'))}`;
        return `${base}subtitles/${language}${query}`;
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
      }
    }
  }
</script>

<style scoped>

</style>