<template>
  <v-container>
    <item-list :headers="headers" v-model="items" url="/assets" ref="items" :loading="loading">
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="preview(items[0])">Preview</v-btn>
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="download(items[0])">Download</v-btn>
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
          <div v-if="item.state === 'processed'">
          <v-list-item v-for="lang of ['nl','en','fr','de']" :key="`upload-${lang}`">
            <v-list-item-title class="file">
              <input type="file" @change="uploadSubtitles(item, lang, $event)">
              Upload subtitles ({{ lang }})
            </v-list-item-title>
          </v-list-item>
          </div>
          <v-list-item v-for="lang of ['nl','en','fr','de']" :key="`download-${lang}`" v-show="item && item.subtitles && item.subtitles[lang]" :href="downloadSubtitleUrl(item, lang)">
            <v-list-item-title>Download subtitles ({{ lang }})</v-list-item-title>
          </v-list-item>
          <v-list-item @click="getPublicUrl(item)">
            <v-list-item-title>Get public URL</v-list-item-title>
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
    <edit-asset-dialog v-model="editItemDialog" :item="item" @saved="$refs.items.update()"/>
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
  import clone from 'lodash/clone';
  import { basename } from 'path';
  import socketio from 'socket.io-client';
  import events from '@/events';
  import ItemList from '@/components/ItemList';
  import setClipboard from '@/util/set-clipboard';
  import VaemPlayer from '@/components/VaemPlayer';
  import ShareDialog from '@/components/assets/ShareDialog';
  import EditAssetDialog from '@/components/assets/EditAssetDialog';

  export default {
    name: 'Assets',
    components: { EditAssetDialog, ShareDialog, VaemPlayer, ItemList },
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
        editItemDialog: false,
        infoPopup: false,
        infoItem: false,
        playerItem: null,
        player: false,

        shareItem: {},
        shareDialog: false,
        loading: false
      };
    },
    methods: {
      async open(item) {
        this.labels = (await this.$axios.get('/assets/labels')).data;
        this.item = clone(item);
        this.editItemDialog = true;
      },

      downloadSubtitleUrl(item, subtitleLanguage) {
        if (!item) {
          return '';
        }

        const base = `${process.env.VUE_APP_API_URL}/assets/${item._id}/`;
        const query = `?token=${encodeURIComponent(localStorage.getItem('token'))}`;
        return `${base}subtitles/${subtitleLanguage}${query}`;
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
        this.loading = true;
        await this.axios.put(`/assets/${item._id}/subtitles/${language}/${basename(target.files[0].name)}`, target.files[0]);
        target.value = '';
        this.$refs.items.update();
        this.loading = false;
      },

      async remove(item) {
        await this.$axios.delete(`/assets/${item._id}`);
        this.$refs.items.update({force: true});
      },

      async download(item) {
        location.href = process.env.VUE_APP_API_URL + (await this.$axios.get(`/assets/${item._id}/download`)).data;
      },

      async getPublicUrl(item) {
        let isPublic = item.public;

        if (!isPublic && (await this.$confirm('Asset is not yet set to public. Do you want to set the asset to public?', {
          title: 'Warning'
        }))) {
          await this.$axios.post(`/assets/${item._id}`, {
            public: true
          });
          isPublic = true;
        }

        if (isPublic) {
          setClipboard(`${process.env.VUE_APP_API_URL}/streams/-/-/${item._id}.m3u8`);
          events.emit('toast', 'URL copied successfully');
        }
      }
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