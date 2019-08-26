<template>
  <v-container>
    <div class="white elevation-1">
      <v-data-table :headers="headers" hide-default-footer :items="items">
        <template v-slot:item.progress="{ item }">
          <v-progress-linear :value="calcProgress(item)" v-if="item.state.status !== 'idle'"/>
        </template>
        <template v-slot:item.eta="{ item } ">
          {{ calcEta(item) | duration }}
        </template>
      </v-data-table>
    </div>
  </v-container>
</template>

<script>
  import io from 'socket.io-client';
  import camelCase from 'lodash/camelCase';
  import get from 'lodash/get';

  export default {
    name: 'Encoders',
    data: () => ({
      encoders: [],
      queue: [],
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
          value: 'currentlyProcessing.source'
        },
        {
          text: 'Bitrate',
          value: 'currentlyProcessing.bitrate'
        },
        {
          text: 'Priorty',
          value: 'item.info.priority'
        },
        {
          text: 'CPUs',
          value: 'item.info.cpus[0].model'
        },
        {
          text: 'Status',
          value: 'item.state.status'
        }
      ].map(item => ({...item, sortable: false}))
    }),
    computed: {
      items() {
        return Object.values(this.encoders);
      }
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
        return Math.max(0, ((item.progress.time - item.currentlyProcessing.time)) / progress * (100 - progress) / 1000 * 60);
      },

    },
    async mounted() {
      this.encoders = (await this.$axios.get('/encoders')).data;

      this.io = io(`${process.env.VUE_APP_API_URL}/encoders-io`);

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

    },

    destroyed() {
      this.io.close();
    }
  }
</script>

<style scoped>

</style>