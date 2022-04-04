<template>
  <v-select
    v-model="proxyValue"
    :label="label"
    :items="audioStreams"
    item-text="text"
    item-value="index"
    chips
    deletable-chips
    multiple
    :loading="loading"
  />
</template>

<script>
export default {
  props: {
    value: {
      type: Array,
      required: true
    },
    file: {
      type: Object,
      required: true
    },
    label: {
      type: String,
      default: 'Audio'
    }
  },
  data: () => ({
    streams: [],
    loading: false
  }),
  computed: {
    proxyValue: {
      get () {
        return this.value
      },
      set (newValue) {
        this.$emit('input', newValue)
      }
    },
    audioStreams () {
      return this.streams
        .filter(({ codec_type }) => codec_type === 'audio')
        .map(item => ({
          ...item,
          text: `Stream ${item.index} (${[
            `${item.channels} channel${item.channels !== 1 ? 's' : ''}`,
            item.channel_layout
          ].filter(Boolean).join(', ')})`
        }))
    }
  },
  watch: {
    file: {
      handler () {
        return this.loadStreams()
      },
      immediate: true
    }
  },
  methods: {
    async loadStreams () {
      this.loading = true
      if (this.file) {
        const { streams, audio } = await this.$axios.$get(`/files/${this.file._id}/ffprobe`)
        this.streams = streams
        this.$emit('input', audio)
      } else {
        this.streams = []
        this.audio = []
      }
      this.loading = false
    }
  }
}
</script>
