<!--
  - VAEM - Asset manager
  - Copyright (C) 2018  Wouter van de Molengraft
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
  <div :class="playerClass">
    <video controls class="video-js vjs-default-skin" preload="none" ref="video" autoplay>
    </video>
  </div>
</template>
<script>
  import videojs from 'video.js';
  import 'video.js/dist/video-js.css';
  import each from 'lodash/each';
  import config from '@/config';

  export default {
    name: 'VaemPlayer',
    props: {
      assetId: String,
      fullscreen: {type: Boolean, default: false},
      item: Object
    },
    computed: {
      playerClass() {
        return this.fullscreen ? 'player-fullscreen' : 'player-container'
      }
    },
    data: () => ({
      player: null
    }),
    watch: {
      assetId() {
        if (this.player) {
          this.load();
        }
      }
    },

    methods:
      {
        async load() {
          // remove any text tracks
          for (let track of Array.from(this.player.remoteTextTracks())) {
            this.player.removeRemoteTextTrack(track);
          }

          const item = this.item || (await this.axios.get(`/streams/${this.assetId}/item`)).data;

          this.player.src({
            type: 'application/x-mpegURL',
            src: config.apiUrl + item.streamUrl
          });

          const subtitles = (item || {}).subtitles;
          if (subtitles) {
            each(subtitles, (url, language) => {
              this.player.addRemoteTextTrack({
                kind: 'subtitles',
                srclang: language,
                src: config.apiUrl + url,
                default: language === 'nl'
              });
            });
          }
        }
      },
    mounted() {
      this.player = videojs(this.$refs['video'], null, () => {
        if (this.assetId || this.item) {
          this.load();
        }
      });
    },

    destroyed() {
      this.player.dispose();
    }
  }
</script>
<style scoped lang="scss">
  .player-container, .player-fullscreen {
    width: 100%;
    padding-top: 9/16*100%;
    position: relative;

    video, .video-js {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      background: black;
    }
  }

  .player-fullscreen {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 0;
  }
</style>
