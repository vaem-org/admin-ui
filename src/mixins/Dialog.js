export default {
  props: {
    value: Boolean
  },

  data: () => ({
    dialog: false
  }),

  watch: {
    async value(val) {
      if (val && this.initDialog) {
        if ((await this.initDialog()) === false) {
          this.$emit('input', false);
          return;
        }
      }
      this.dialog = val;
    },

    dialog(val) {
      this.$emit('input', val);
    }
  },

  mounted() {
    this.$emit('input', this.dialog);
  }
}