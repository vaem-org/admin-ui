<template>
  <v-dialog v-model="dialog" max-width="800px">
    <v-card>
      <v-card-title>
        <span>Streams for <em>{{ item.title }}</em></span>
      </v-card-title>
      <v-card-text>
        <v-data-table :headers="headers"
                      :items="streams.streams"
                      hide-default-footer
                      v-model="selectedStreams"
                      item-key="index"
        >
          <template v-slot:item.useAs="{ item }">
            <v-select v-if="item.codec_type === 'audio'" :items="getAudioOptions(item)" flat
                      :value="getChannel(item)" @change="setChannel($event, item)"/>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn @click="dialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="selectAudioStreams">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import get from 'lodash/get';
  import set from 'lodash/set';
  import each from 'lodash/each';

  export default {
    name: 'StreamsDialog',
    props: {
      value: Boolean,
      item: Object
    },
    data: () => ({
      dialog: false,
      streams: {
        streams: []
      },
      selectedStreams: [],
      headers: [
        {
          text: 'Index',
          value: 'index'
        }, {
          text: 'Use as',
          value: 'useAs'
        }, {
          text: 'Type',
          value: 'codec_type'
        }, {
          text: 'Codec',
          value: 'codec_long_name'
        }, {
          text: 'Channel',
          value: 'channel_layout'
        }].map(item => ({
        ...item,
        sortable: false
      }))
    }),

    watch: {
      async value(val) {
        if (val) {
          this.streams = (await this.$axios.get(`/uploads/${this.item._id}/streams`)).data;
          this.dialog = true;
        } else {
          this.dialog = false;
        }
      },

      dialog(value) {
        this.$emit('input', value);
      }
    },

    methods: {
      getChannel(item) {
        let result = null;

        switch (item.channels) {
          case 1:
            each(item.channels, (channelNames, key) => {
              const channelIndex = _.get(this.streams, ['streams', 'audioStreams', key], []).indexOf(item.index);
              if (channelIndex !== -1) {
                result = channelNames[channelIndex];
              }
            });

            return result;

          case 2:
            return get(this.streams, 'audioStreams.stereo[0]') === item.index ? 'Stereo' : '';

          case 6:
            return get(this.streams, 'audioStreams.surround[0]') === item.index ? 'Surround' : '';
        }

        return null;
      },

      setChannel(selected, item) {
        switch (item.channels) {
          case 1:
            each(item.channels, (channelNames, key) => {
              const channelIndex = channelNames.indexOf(selected);
              set(this.streams, ['audioStreams', key, channelIndex], item.index);
            });
            return;

          case 2:
            set(this.streams, 'audioStreams.stereo', [item.index]);
            return;

          case 6:
            set(this.streams, 'audioStreams.surround', [item.index]);
            return;
        }
      },

      async selectAudioStreams() {
        await this.$axios.post(
          `uploads/${this.item._id}/audio-streams`,
          this.streams.audioStreams
        );

        this.dialog = false;
      },

      getAudioOptions(item) {
        switch (item.channels) {
          case 1:
            return [...item.channels.stereo, ...item.channels.surround];
          case 2:
            return ['Stereo'];
          case 6:
            return ['Surround'];

          default:
            return [];
        }
      }
    }
  }
</script>

<style scoped>
  >>> th span {
    white-space: nowrap;
  }
  >>> td {
    word-break: normal;
  }
</style>