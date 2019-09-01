<template>
  <v-container>
    <item-list :headers="headers" v-model="items" url="/assets" ref="items" :loading="loading">
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="openDialog(items[0], 'player')">Preview</v-btn>
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="download(items[0])">Download</v-btn>
      <v-btn text tile color="primary" :disabled="items.length!==1" @click="openDialog(items[0], 'editItem')">Edit</v-btn>
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="openDialog(items[0], 'share')">Share</v-btn>
      <v-btn v-if="showEmbedButton" text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="openDialog(items[0], 'embed')">Embed</v-btn>
      <template v-slot:contextMenu="{ item }">
        <v-list>
          <v-list-item @click="openDialog(item, 'player')" v-if="item.state === 'processed'">
            <v-list-item-title>Preview</v-list-item-title>
          </v-list-item>
          <v-list-item @click="openDialog(item, 'editItem')">
            <v-list-item-title>Edit</v-list-item-title>
          </v-list-item>
          <v-list-item @click="openDialog(item, 'share')" v-if="item.state === 'processed'">
            <v-list-item-title>Share</v-list-item-title>
          </v-list-item>
          <v-list-item @click="addMissingBitrates(item)">
            <v-list-item-title>Add missing bitrates</v-list-item-title>
          </v-list-item>
          <v-list-item @click="openDialog(item, 'info')">
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
    <v-dialog v-model="infoDialog" max-width="80%">
      <v-card>
        <v-card-text>
          <tree-view :data="item" class="py-3"/>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog v-model="playerDialog" max-width="1024px">
      <v-card>
        <v-responsive>
          <vaem-player :asset-id="item._id" v-if="playerDialog && item"/>
        </v-responsive>
      </v-card>
    </v-dialog>
    <share-dialog v-model="shareDialog" :item="item"/>
    <embed-dialog v-model="embedDialog" :item="item"/>
  </v-container>
</template>

<script>
  import cloneDeep from 'lodash/cloneDeep';
  import { basename } from 'path';
  import { socketio } from '@/util/socketio';
  import ItemList from '@/components/ItemList';
  import setClipboard from '@/util/set-clipboard';
  import VaemPlayer from '@/components/VaemPlayer';
  import ShareDialog from '@/components/assets/ShareDialog';
  import EditAssetDialog from '@/components/assets/EditAssetDialog';
  import EmbedDialog from '@/components/assets/EmbedDialog';
  import config from '@/config';

  export default {
    name: 'Assets',
    components: { EmbedDialog, EditAssetDialog, ShareDialog, VaemPlayer, ItemList },
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
        infoDialog: false,
        playerDialog: false,
        shareDialog: false,
        embedDialog: false,

        loading: false,
        showEmbedButton: !!config.embedUrl
      };
    },
    methods: {
      async open(item) {
        this.labels = (await this.$axios.get('/assets/labels')).data;
        this.item = cloneDeep(item);
        this.editItemDialog = true;
      },

      copyId(item) {
        setClipboard(item._id);
      },

      openDialog(item, prop) {
        this.item = cloneDeep(item);
        this[`${prop}Dialog`] = true;
      },

      async addMissingBitrates(item) {
        await this.$axios.post('/encoders/start-job', {assetId: item._id});
      },

      async remove(item) {
        await this.$axios.delete(`/assets/${item._id}`);
        this.$refs.items.update({force: true});
      },

      async download(item) {
        location.href = config.apiUrl + (await this.$axios.get(`/assets/${item._id}/download`)).data;
      }
    },

    mounted() {
      this.io = socketio('/global');

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