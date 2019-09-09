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
    <div class="white elevation-1">
      <v-badge right overlap :value="queue.length !== 0">
        <span slot="badge">{{ queue.length }}</span>
        <v-btn outlined color="primary" @click="queueDialog = true" class="ma-2">
          Queue
        </v-btn>
      </v-badge>
      <v-btn outlined color="primary" @click="copyDockerCommand">Copy docker command</v-btn>

      <v-data-table :headers="headers" hide-default-footer :items="items" :mobile-breakpoint="0">
        <template v-slot:item.progress="{ item }">
          <v-progress-linear :value="calcProgress(item)" v-if="item.state.status !== 'idle'"/>
        </template>
        <template v-slot:item.eta="{ item } ">
          {{ calcEta(item) | duration }}
        </template>
        <template v-slot:item.priority="{ item }">
          <v-edit-dialog
            :return-value.sync="item.info.priority"
            lazy
          >
            {{ item | get('info.priority', 0) }}
            <v-text-field slot="input" label="Priority" v-model="item.info.priority"
                          @change="updatePriority(item)"/>
          </v-edit-dialog>
        </template>
        <template v-slot:item.source="{ item }">
          {{ item|get('currentlyProcessing.source', '') | basename }}
        </template>
        <template v-slot:item.cpus="{ item }">
          {{ item.info.cpus.length }}x {{ item|get('info.cpus[0].model')}}
        </template>
      </v-data-table>
    </div>

    <v-dialog v-model="queueDialog">
      <v-card>
        <v-card-title class="headline">Queue</v-card-title>
        <v-card-text>
          <v-data-table :headers="queueHeaders" hide-default-footer :items="queue">
            <template v-slot:item.source="{ item }">
              {{ item.source | basename }}
            </template>
            <template v-slot:item.bitrate="{ item }">
              {{ item.options.maxrate || item.bitrate }}
            </template>
            <template v-slot:item.actions="{ item }">
              <v-btn text icon @click="remove(item.index)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
  import camelCase from 'lodash/camelCase';
  import get from 'lodash/get';
  import { socketio } from '@/util/socketio';
  import setClipboard from '@/util/set-clipboard';

  export default {
    name: 'Encoders',
    data: () => ({
      encoders: [],
      queue: [],
      queueDialog: false,
      queueHeaders: ['Source', 'Bitrate', 'Actions'].map(text => ({text, value: text.toLowerCase(), sortable: false})),
      headers: [
        {
          text: 'Progress',
          value: 'progress'
        },
        {
          text: 'ETA',
          value: 'eta'
        },
        {
          text: 'Source',
          value: 'source'
        },
        {
          text: 'Bitrate',
          value: 'currentlyProcessing.bitrate'
        },
        {
          text: 'Priorty',
          value: 'priority'
        },
        {
          text: 'CPUs',
          value: 'cpus'
        }
      ].map(item => ({...item, sortable: false})),
      dockerCommand: ''
    }),
    computed: {
      items() {
        return Object.values(this.encoders);
      }
    },
    filters: {
      get
    },
    methods: {
      calcProgress(item) {
        let duration = parseFloat(get(item, 'currentlyProcessing.parameters.duration', 0));
        if (duration === 0) {
          return 0;
        }
        return get(item, 'progress.current') / duration * 100;
      },
      calcEta(item) {
        if (!item) {
          return 0;
        }
        const progress = this.calcProgress(item);
        return Math.max(0, ((item.progress.time - item.currentlyProcessing.time)) / progress * (100 - progress) / 1000);
      },

      async remove(index) {
        await this.$axios.delete(`/encoders/jobs/${index}`);
      },

      async updatePriority(encoder) {
        await this.$axios.post(`/encoders/${encoder.id}/priority`, {priority: encoder.info.priority});
      },

      async copyDockerCommand() {
        setClipboard(this.dockerCommand);
      }
    },
    async mounted() {
      this.encoders = (await this.$axios.get('/encoders')).data;
      this.queue = (await this.$axios.get('/encoders/queue')).data;

      this.io = socketio('/encoders-io');

      const socket = this.io;

      ['info', 'currently-processing', 'state', 'progress'].forEach(event => {
        socket.on(event, data => {
          this.$set(this.encoders, data.id, Object.assign({}, this.encoders[data.id], {
            [camelCase(event)]: data.data
          }));
        });
      });
      socket.on('new', data => {
        this.$set(this.encoders, data.id, data.data);
      });
      socket.on('removed', data => {
        this.$delete(this.encoders, data.id);
      });
      socket.on('source-done', data => {
        console.log(`Source done "${data.filename}"`);
      });
      socket.on('queue-update', async () => {
        this.queue = (await this.$axios.get('/encoders/queue')).data;
      });

      this.dockerCommand = (await this.$axios.get('/encoders/docker')).data;
    },

    destroyed() {
      this.io.close();
    }
  }
</script>

<style scoped>

</style>
