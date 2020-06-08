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
  <v-dialog v-model="dialog" max-width="600px">
    <v-card>
      <v-card-title>Embed asset</v-card-title>
      <v-card-text>
        <v-row>
          <v-col>
            <v-switch label="Controls" v-model="controls"/>
          </v-col>
          <v-col>
            <v-switch label="Auto play" v-model="autoplay"/>
          </v-col>
          <v-col>
            <v-switch label="Muted" v-model="muted"/>
          </v-col>
          <v-col>
            <v-switch label="Loop" v-model="loop"/>
          </v-col>
        </v-row>
        <div class="flex">
          <v-text-field v-model="embedUrl" label="URL" readonly filled/>
          <v-btn small icon @click="copyUrl" class="ma-2">
            <v-icon>mdi-content-copy</v-icon>
          </v-btn>
        </div>
        <div class="flex">
          <v-textarea v-model="embedCode" label="HTML" filled readonly/>
          <v-btn small icon @click="copyCode" class="ma-2">
            <v-icon>mdi-content-copy</v-icon>
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer/>
        <v-btn color="primary" @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import get from 'lodash/get';
  import { stringify } from 'querystring';
  import Dialog from '@/mixins/Dialog';
  import setClipboard from '@/util/set-clipboard';
  import events from '@/events';
  import config from '@/config';

  export default {
    extends: Dialog,
    name: 'EmbedDialog',
    props: {
      item: Object
    },
    data: () => ({
      controls: true,
      autoplay: false,
      muted: false,
      loop: false
    }),
    computed: {
      embedUrl() {
        const query = stringify({
          ...this.controls === false ? { controls: 0 } : {},
          ...this.autoplay ? { autoplay: 1} : {},
          ...this.muted ? { muted: 1} : {},
          ...this.loop ? { loop: 1} : {},
        });
        const url = new URL(this.item._id, config.embedUrl);
        url.search = query;
        return url.toString();
      },
      embedCode() {
        const height = get(this.item, 'videoParameters.height', 0);
        const width = get(this.item, 'videoParameters.width', 0);
        const iframe = `<iframe src="${this.embedUrl}" frameborder="0"${height !== 0 ? ' style="position:absolute;top:0;left:0;width:100%;height:100%"' : ''}></iframe>`;
        if (height !== 0) {
          const paddingTop = (height / width * 100) + '%';
          return `<div style="padding-top:${paddingTop};position:relative">${iframe}</div>`
        }
        return iframe;
      }
    },
    methods: {
      copyCode() {
        setClipboard(this.embedCode);
        events.emit('toast', 'Embed code copied successfully');
      },

      copyUrl() {
        setClipboard(this.embedUrl);
        events.emit('toast', 'URL copied successfully');
      },

      async initDialog() {
        if (!this.item.public && (await this.$confirm('Asset is not yet set to public. Do you want to set it to public?', {
          title: 'Warning'
        }))) {
          await this.$axios.post(`/assets/${this.item._id}`, {
            public: true
          });
          this.$emit('saved');
        } else if (!this.item.public) {
          return false;
        }
      }
    }
  }
</script>

<style scoped lang="scss">
  .flex {
    display: flex;

    > :first-child {
      flex-grow: 1;
    }
  }
</style>
