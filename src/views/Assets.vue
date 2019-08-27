<template>
  <v-container>
    <item-list :headers="headers" v-model="items" url="/assets" ref="items">
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="preview(items[0])">Preview</v-btn>
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" :href="downloadUrl(items[0])">Download</v-btn>
      <v-btn text tile color="primary" :disabled="items.length!==1" @click="open(items[0])">Edit</v-btn>
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="openShareDialog(items[0])">Share</v-btn>
      <template v-slot:contextMenu="{ item }">
        <v-list>
          <v-list-item @click="preview(item)" v-if="item.state === 'processed'">
            <v-list-item-title>Preview</v-list-item-title>
          </v-list-item>
          <v-list-item @click="open(item)">
            <v-list-item-title>Edit</v-list-item-title>
          </v-list-item>
          <v-list-item @click="openShareDialog(item)" v-if="item.state === 'processed'">
            <v-list-item-title>Share</v-list-item-title>
          </v-list-item>
          <v-list-item @click="addMissingBitrates(item)">
            <v-list-item-title>Add missing bitrates</v-list-item-title>
          </v-list-item>
          <v-list-item v-for="lang of ['nl','en','fr','de']" :key="`upload-${lang}`" v-if="item.state === 'processed'">
            <v-list-item-title class="file">
              <input type="file" @change="uploadSubtitles(item, lang, $event)">
              Upload subtitles ({{ lang }})
            </v-list-item-title>
          </v-list-item>
          <v-list-item v-for="lang of ['nl','en','fr','de']" :key="`download-${lang}`" v-show="item && item.subtitles && item.subtitles[lang]" :href="downloadUrl(item, lang)">
            <v-list-item-title>Download subtitles ({{ lang }})</v-list-item-title>
          </v-list-item>
          <v-list-item @click="showInfo(item)">
            <v-list-item-title>Show info</v-list-item-title>
          </v-list-item>
          <v-list-item @click="copyId(item)">
            <v-list-item-title>Copy id</v-list-item-title>
          </v-list-item>
          <v-list-item @click="remove(item)">
            <v-list-item-title>Remove</v-list-item-title>
          </v-list-item>
        </v-list>
      </template>
      <template v-slot:item.progress="{ item }">
        {{ (item.bitrates || []).length }} / {{ (item.jobs || []).length }}
      </template>
      <template v-slot:item.labels="{ item }">
        <v-chip v-for="label of item.labels" :key="label" class="my-1">{{ label }}</v-chip>
      </template>
      <template v-slot:item.createdAt="{ item }">
        {{ item.createdAt | date }}
      </template>
      <template v-slot:item.subtitles="{ item }">
        {{ Object.keys(item.subtitles || {}).length > 0 ? 'Yes' : 'No' }}
      </template>
      <template v-slot:item.videoParameters.duration="{ item }">
        {{ item.videoParameters.duration | duration }}
      </template>
    </item-list>
    <v-dialog v-model="popup" max-width="600px">
      <v-card>
        <v-form @submit.prevent="saveItem">
          <v-card-title>
            <span>Edit asset</span>
          </v-card-title>
          <v-card-text>
            <v-text-field label="Title" v-model="item.title"/>
            <v-combobox label="Labels" v-model="item.labels" tags chips deletable-chips :items="labels" multiple/>
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn @click="popup=false">Cancel</v-btn>
            <v-btn type="submit" color="primary">Save</v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
    <v-dialog v-model="infoPopup" max-width="80%">
      <v-card>
        <v-card-text>
          <tree-view :data="infoItem" class="py-3"/>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog v-model="player" max-width="1024px">
      <v-card>
        <v-responsive>
          <vaem-player :asset-id="playerItem._id" v-if="player && playerItem"/>
        </v-responsive>
      </v-card>
    </v-dialog>
    <share-dialog v-model="shareDialog" :item="shareItem"/>
  </v-container>
</template>

<script>
  import ItemList from '../components/ItemList';
  import clone from 'lodash/clone';
  import setClipboard from '../util/set-clipboard';
  import VaemPlayer from '../components/VaemPlayer';
  import socketio from 'socket.io-client';
  import ShareDialog from '@/components/assets/ShareDialog';

  export default {
    name: 'Assets',
    components: { ShareDialog, VaemPlayer, ItemList },
    data() {
      return {
        items: [],
        headers: [
          { text: 'Title', value: 'title' },
          { text: 'Labels', value: 'labels' },
          { text: 'State', value: 'state' },
          { text: 'Progress', value: 'progress' },
          { text: 'Date', value: 'createdAt' },
          { text: 'Duration', value: 'videoParameters.duration' },
          { text: 'Subtitles', value: 'subtitles' }
        ],
        item: {},
        popup: false,
        labels: [],
        infoPopup: false,
        infoItem: false,
        playerItem: null,
        player: false,

        shareItem: {},
        shareDialog: false
      };
    },
    methods: {
      async open(item) {
        this.labels = (await this.$axios.get('/assets/labels')).data;
        this.item = clone(item);
        this.popup = true;
      },

      downloadUrl(item, subtitleLanguage) {
        if (!item) {
          return '';
        }

        const base = `${process.env.VUE_APP_API_URL}/assets/${item._id}/`;
        const query = `?token=${encodeURIComponent(localStorage.getItem('token'))}`;
        if (subtitleLanguage) {
          return `${base}subtitles/${subtitleLanguage}${query}`;
        } else {
          return `${base}stream.ts${query}`
        }
      },

      copyId(item) {
        setClipboard(item._id);
      },

      showInfo(item) {
        this.infoPopup = true;
        this.infoItem = item;
      },

      preview(item) {
        this.playerItem = item;
        this.player = true;
      },

      openShareDialog(item) {
        this.shareItem = item;
        this.shareDialog = true;
      },

      async addMissingBitrates(item) {
        await this.$axios.post('/encoders/start-job', {assetId: item._id});
      },

      async uploadSubtitles(item, language, {target}) {
        console.log(target.value);
        console.log(target.files);
        await this.axios.put(`/assets/${item._id}/subtitles/${language}`, target.files[0]);
        target.value = '';
      },

      async remove(item) {
        await this.$axios.delete(`/assets/${item._id}`);
        this.$refs.items.update({force: true});
      },

      async saveItem() {
        await this.$axios.post(`/assets/${this.item._id}`, this.item);
        this.popup = false;
        this.$refs.items.update();
      },
    },

    mounted() {
      this.io = socketio(`${process.env.VUE_APP_API_URL}/global`);

      this.io.on('job-completed', (item) => {
        this.$refs.items.update({
          item
        });
      });

      this.io.on('asset-added', () => {
        this.$refs.items.update();
      })
    },

    destroyed() {
      this.io.close();
      this.io = null;
    }
  }
</script>

<style scoped lang="scss">
  .file {
    position: relative;
    overflow: hidden;
    input {
      position: absolute;
      margin-left: -200px;
      width: calc(100% + 200px);
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      cursor: pointer;
      opacity: 0;
    }
  }
</style>