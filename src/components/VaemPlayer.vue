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
      item: Object,
      url: String
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
      },

      url() {
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

          let item;

          console.log(this.url);
          if (this.url) {
            this.player.src({
              type: 'application/x-mpegURL',
              src: config.apiUrl + this.url
            })
          } else {
            item = this.item || (await this.axios.get(`/streams/${this.assetId}/item`)).data;

            this.player.src({
              type: 'application/x-mpegURL',
              src: config.apiUrl + item.streamUrl
            });
          }

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
        if (this.assetId || this.item || this.url) {
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

  ::v-deep {
    .video-js .vjs-menu-button-inline.vjs-slider-active, .video-js .vjs-menu-button-inline:focus, .video-js .vjs-menu-button-inline:hover, .video-js.vjs-no-flex .vjs-menu-button-inline {
      width: 10em
    }

    .video-js .vjs-control {
      width: 3em
    }

    .video-js .vjs-menu-button-inline:before {
      width: 1.5em
    }

    .vjs-menu-button-inline .vjs-menu {
      left: 3em
    }

    .video-js .vjs-mouse-display:after, .video-js .vjs-play-progress:after {
      padding: 0 .4em .3em
    }

    .video-js.vjs-ended .vjs-loading-spinner {
      display: none;
    }

    .video-js.vjs-fullscreen, .video-js.vjs-fullscreen .vjs-tech {
      width: 100% !important;
      height: 100% !important
    }

    .video-js {
      font-size: 14px;
      overflow: hidden
    }

    .video-js .vjs-control {
      color: inherit
    }

    .video-js .vjs-menu-button-inline:hover, .video-js.vjs-no-flex .vjs-menu-button-inline {
      width: 8.35em
    }

    .video-js .vjs-volume-menu-button.vjs-volume-menu-button-horizontal:hover .vjs-menu .vjs-menu-content {
      height: 3em;
      width: 6.35em
    }

    .video-js .vjs-control:focus:before, .video-js .vjs-control:hover:before {
      text-shadow: 0 0 1em #fff, 0 0 1em #fff, 0 0 1em #fff
    }

    .video-js .vjs-spacer, .video-js .vjs-time-control {
      display: flex;
      flex: 1 1 auto
    }

    .video-js .vjs-time-control {
      padding-left: 0;
      padding-right: 0;
      flex: 0 1 auto;
      width: auto
    }

    .video-js .vjs-time-control.vjs-time-divider div {
      width: 100%;
      text-align: center
    }

    .video-js .vjs-time-control.vjs-current-time {
      margin-left: 1em
    }

    .video-js .vjs-time-control .vjs-current-time-display, .video-js .vjs-time-control .vjs-duration-display {
      width: 100%
    }

    .video-js .vjs-time-control .vjs-current-time-display {
      text-align: right
    }

    .video-js .vjs-time-control .vjs-duration-display {
      text-align: left
    }

    .video-js .vjs-play-progress:before, .video-js .vjs-progress-control .vjs-play-progress:before, .video-js .vjs-remaining-time, .video-js .vjs-volume-level:after, .video-js .vjs-volume-level:before, .video-js.vjs-live .vjs-time-control.vjs-current-time, .video-js.vjs-live .vjs-time-control.vjs-duration, .video-js.vjs-live .vjs-time-control.vjs-time-divider, .video-js.vjs-no-flex .vjs-time-control.vjs-remaining-time {
      display: none
    }

    .video-js.vjs-no-flex .vjs-time-control {
      display: table-cell;
      width: 4em
    }

    .video-js .vjs-progress-control {
      position: absolute;
      left: 0;
      right: 0;
      width: 100%;
      height: .5em;
      top: -.5em
    }

    .video-js .vjs-progress-control .vjs-load-progress, .video-js .vjs-progress-control .vjs-play-progress, .video-js .vjs-progress-control .vjs-progress-holder {
      height: 100%
    }

    .video-js .vjs-progress-control .vjs-progress-holder {
      margin: 0
    }

    .video-js .vjs-progress-control:hover {
      height: 1em;
      top: -1em
    }

    .video-js .vjs-control-bar {
      transition: transform .1s ease 0s
    }

    .video-js.not-hover.vjs-has-started.vjs-paused.vjs-user-active .vjs-control-bar, .video-js.not-hover.vjs-has-started.vjs-paused.vjs-user-inactive .vjs-control-bar, .video-js.not-hover.vjs-has-started.vjs-playing.vjs-user-active .vjs-control-bar, .video-js.not-hover.vjs-has-started.vjs-playing.vjs-user-inactive .vjs-control-bar, .video-js.vjs-has-started.vjs-playing.vjs-user-inactive .vjs-control-bar {
      visibility: visible;
      opacity: 1;
      transform: translateY(3.5em);
      transition: transform 1s ease 0s
    }

    .video-js.not-hover.vjs-has-started.vjs-paused.vjs-user-active .vjs-progress-control, .video-js.not-hover.vjs-has-started.vjs-paused.vjs-user-inactive .vjs-progress-control, .video-js.not-hover.vjs-has-started.vjs-playing.vjs-user-active .vjs-progress-control, .video-js.not-hover.vjs-has-started.vjs-playing.vjs-user-inactive .vjs-progress-control, .video-js.vjs-has-started.vjs-playing.vjs-user-inactive .vjs-progress-control {
      height: .25em;
      top: -.25em;
      pointer-events: none;
      transition: height 1s, top 1s
    }

    .video-js.not-hover.vjs-has-started.vjs-paused.vjs-user-active.vjs-fullscreen .vjs-progress-control, .video-js.not-hover.vjs-has-started.vjs-paused.vjs-user-inactive.vjs-fullscreen .vjs-progress-control, .video-js.not-hover.vjs-has-started.vjs-playing.vjs-user-active.vjs-fullscreen .vjs-progress-control, .video-js.not-hover.vjs-has-started.vjs-playing.vjs-user-inactive.vjs-fullscreen .vjs-progress-control, .video-js.vjs-has-started.vjs-playing.vjs-user-inactive.vjs-fullscreen .vjs-progress-control {
      opacity: 0;
      transition: opacity 1s ease 1s
    }

    .video-js.vjs-live .vjs-live-control {
      margin-left: 1em
    }

    .video-js .vjs-menu-button-popup .vjs-menu {
      left: -3em
    }

    .video-js .vjs-menu-button-popup .vjs-menu .vjs-menu-content {
      background-color: transparent;
      width: 12em;
      left: -1.5em;
      padding-bottom: .5em
    }

    .video-js .vjs-menu-button-popup .vjs-menu .vjs-menu-item, .video-js .vjs-menu-button-popup .vjs-menu .vjs-menu-title {
      background-color: #151b17;
      margin: .3em 0;
      padding: .5em;
      border-radius: .3em
    }

    .video-js .vjs-control-bar2 {
      background-color: #000000
    }

    .video-js .vjs-control-bar {
      background-color: rgba(0, 0, 0, 0.4) !important;
      color: #ffffff;
      font-size: 16px
    }

    .video-js .vjs-play-progress, .video-js .vjs-volume-level {
    }

    .video-js .vjs-load-progress {
      background: rgba(255, 255, 255, 0.8);
    }

    .video-js .vjs-control:focus:before, .video-js .vjs-control:hover:before {
      color: #b99beb;
      text-shadow: none
    }

    ::cue,
    .vjs-text-track-display,
    .vjs-text-track-display * {
      background: transparent !important;
      text-shadow: 2px 2px rgba(#333, 0.8) !important;
    }
  }
</style>
