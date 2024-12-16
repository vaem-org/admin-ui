<template>
  <v-text-field
    v-model="proxy"
    v-mask="'##:##:##'"
    placeholder="##:##:##"
    :label="label"
    v-bind="$attrs"
  />
</template>

<script>
import { mask } from '@/directives/mask'

export default {
  name: 'InputTime',
  directives: {
    mask
  },
  props: {
    value: {
      type: String,
      required: true
    },
    label: {
      type: String,
      default: null
    }
  },
  computed: {
    proxy: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    }
  }
}
</script>
