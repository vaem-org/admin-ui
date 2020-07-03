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
  <v-container>
    <item-list :headers="headers" v-model="items" url="/assets" ref="items" :loading="loading" @menu="menuVisible=$event">
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="openDialog(items[0], 'player')">Preview</v-btn>
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="download(items[0])">Download</v-btn>
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="openDialog(items[0], 'share')">Share</v-btn>
      <v-btn v-if="showEmbedButton" text tile color="primary" :disabled="items.length!==1 || items[0].state !== 'processed'" @click="openDialog(items[0], 'embed')">Embed</v-btn>
      <template v-slot:contextMenu="{ item }">
        <v-list>
          <v-list-item @click="openDialog(item, 'player')" v-if="item.state === 'processed'">
            <v-list-item-title>Preview</v-list-item-title>
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
          <v-list-item @click="copyStreamUrl(item)">
            <v-list-item-title>Copy stream url</v-list-item-title>
          </v-list-item>
          <v-list-item @click="remove(item)">
            <v-list-item-title>Remove</v-list-item-title>
          </v-list-item>
        </v-list>
      </template>
      <template v-slot:item.public="{ item }">
        {{ item.public ? 'Yes' : 'No' }}
      </template>
      <template v-slot:item.progress="{ item }">
        <v-progress-linear :value="(item.bitrates || []).length / (item.numStreams || (item.jobs || []).length) * 100"
                           :color="item.state==='processed' ? 'success' : 'primary'"/>
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
        {{ (item.videoParameters || {}).duration | duration }}
      </template>
    </item-list>
    <v-dialog v-model="infoDialog" max-width="80%">
      <v-card>
        <v-card-text>
          <tree-view :data="item" class="py-3" :options="{maxDepth: 1}"/>
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
    <embed-dialog v-model="embedDialog" :item="item" @saved="update"/>
    <v-navigation-drawer right app width="400" :permanent="$vuetify.breakpoint.mdAndUp" v-model="navigationDrawer" :touchless="$vuetify.breakpoint.mdAndUp">
      <v-btn icon class="hidden-sm-and-up" :to="{name: 'assets'}"><v-icon>mdi-close</v-icon></v-btn>
      <router-view name="right" @saved="update" :timestamp="timestamp" :labels="labels"/>
    </v-navigation-drawer>
  </v-container>
</template>

<script>
  import cloneDeep from 'lodash/cloneDeep';
  import { socketio } from '@/util/socketio';
  import ItemList from '@/components/ItemList';
  import setClipboard from '@/util/set-clipboard';
  import VaemPlayer from '@/components/VaemPlayer';
  import ShareDialog from '@/components/assets/ShareDialog';
  import EmbedDialog from '@/components/assets/EmbedDialog';
  import config from '@/config';

  export default {
    name: 'Assets',
    components: { EmbedDialog, ShareDialog, VaemPlayer, ItemList },
    data() {
      return {
        items: this.$route.params.id ? [{_id:this.$route.params.id}] : [],
        headers: [
          { text: 'Title', value: 'title' },
          { text: 'Public', value: 'public' },
          { text: 'Labels', value: 'labels' },
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
        showEmbedButton: !!config.embedUrl,
        labels: [],
        timestamp: Date.now(),

        navigationDrawer: this.$route.params.id !== undefined,
        menuVisible: false
      };
    },
    watch: {
      async items(value) {
        try {
          if (value.length === 1) {
            await this.$router.replace({
              name: 'asset',
              params: {
                id: value[0]._id
              }
            })
          } else {
            await this.$router.replace({
              name: 'assets'
            })
          }
        }
        catch (e) {
          // ignore navigation errors
        }
      }
    },
    methods: {
      copyId(item) {
        setClipboard(item._id);
      },

      openDialog(item, prop) {
        this.item = cloneDeep(item);
        this[`${prop}Dialog`] = true;
      },

      async addMissingBitrates(item) {
        await this.$axios.post('/encoders/start-job', { assetId: item._id });
      },

      async remove() {
        await this.$axios.post('/assets/remove', this.items.map(item => item._id));
        return this.update();
      },

      async download(item) {
        location.href = config.apiUrl + (await this.$axios.get(`/assets/${item._id}/download`)).data;
      },

      async update() {
        this.$refs.items.update({force: true});
        this.labels = (await this.$axios.get('/assets/labels')).data;
        this.timestamp = Date.now();
      },

      async copyStreamUrl(item) {
        const { streamUrl } = (await this.$axios.get(`/streams/${item._id}/item`)).data;
        setClipboard(config.apiUrl + streamUrl);
      }
    },

    async mounted() {
      this.io = socketio('/global');

      this.io.on('job-completed', (item) => {
        this.$refs.items.update({
          item
        });
      });

      this.io.on('asset-added', () => {
        this.$refs.items.update();
      });

      this.labels = (await this.$axios.get('/assets/labels')).data;
    },

    destroyed() {
      this.io.close();
      this.io = null;
    },

    beforeRouteUpdate(to, from, next) {
      if (this.$vuetify.breakpoint.mdAndUp) {
        return next();
      }

      this.navigationDrawer = to.params.id !== undefined;
      next();
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
