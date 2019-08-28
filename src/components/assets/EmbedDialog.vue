<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-title>Embed asset</v-card-title>
      <v-card-text class="text-right">
        <v-textarea v-model="embedCode" label="HTML" filled readonly/>
        <v-btn small icon @click="copyCode">
          <v-icon>mdi-content-copy</v-icon>
        </v-btn>
      </v-card-text>

      <v-card-actions>
        <v-spacer/>
        <v-btn color="primary" @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import Dialog from '@/mixins/Dialog';
  import get from 'lodash/get';
  import setClipboard from '@/util/set-clipboard';
  import events from '@/events';

  export default {
    extends: Dialog,
    name: 'EmbedDialog',
    props: {
      item: Object
    },
    computed: {
      embedCode() {
        const height = get(this.item, 'videoParameters.height', 0);
        const width = get(this.item, 'videoParameters.width', 0);
        const iframe = `<iframe src="${process.env.VUE_APP_EMBED_URL}/${this.item._id}" frameborder="0"></iframe>`;
        if (height !== 0) {
          const paddingTop = Math.round(height / width * 100) + '%';
          return `<div style="padding-top: ${paddingTop}">${iframe}</div>`
        }
        return iframe;
      }
    },
    methods: {
      copyCode() {
        setClipboard(this.embedCode);
        events.emit('toast', 'Embed code copied successfully');
      },

      async initDialog() {
        if (!this.item.public && (await this.$confirm('Asset is not yet set to public. Do you want to set it to public?', {
          title: 'Warning'
        }))) {
          await this.$axios.post(`/assets/${this.item._id}`, {
            public: true
          });
        } else {
          return false;
        }
      }
    }
  }
</script>

<style scoped>

</style>