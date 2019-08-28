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
        await this.initDialog();
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