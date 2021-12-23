<template>
  <v-dialog
    v-model="proxyValue"
    width="600px"
  >
    <vaem-player
      v-if="stream"
      :src="stream.stream"
      autoplay
      :text-tracks="textTracks"
      :aspect-ratio="16/9"
    />
  </v-dialog>
</template>

<script>
import VaemPlayer from '@vaem/player'

export default {
  name: 'DialogPlayer',
  components: {
    VaemPlayer
  },
  props: {
    value: {
      type: Boolean,
      required: true
    },
    assetId: {
      type: String,
      default: null
    }
  },
  data: () => ({
    stream: null
  }),
  async fetch () {
    if (this.assetId) {
      this.stream = await this.$axios.$get(`/assets/${this.assetId}/stream`)
    }
  },
  computed: {
    proxyValue: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    textTracks () {
      return Object.entries(this.stream?.subtitles || {}).map(([srclang, src], i) => ({
        src,
        srclang,
        default: i === 0
      }))
    }
  },
  watch: {
    assetId () {
      this.stream = null
      return this.$fetch()
    }
  }
}
</script>
