<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-title>
        <span>Share <em>{{ item.title }}</em></span>
      </v-card-title>
      <v-form @submit.prevent="share" v-if="!shareUrl">
        <v-card-text>
          <v-text-field label="Choose a password" v-model="password" ref="sharePassword" :rules="[v => !!v || 'Please enter a password']"/>
          <v-text-field label="Number of weeks valid" v-model="weeksValid" type="number"/>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn @click="dialog=false">Cancel</v-btn>
          <v-btn type="submit" color="primary">Get url</v-btn>
        </v-card-actions>
      </v-form>
      <div v-if="shareUrl">
        <v-card-text>
          <div class="flex">
            <v-text-field label="URL" readonly v-model="shareUrl" filled/>
            <v-btn small icon @click="copyShareUrl" class="ma-2">
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn color="primary" @click="dialog = false">Close</v-btn>
        </v-card-actions>
      </div>
    </v-card>
  </v-dialog>
</template>

<script>
  import setClipboard from '@/util/set-clipboard';
  import Dialog from '@/mixins/Dialog';
  import events from '@/events';

  export default {
    extends: Dialog,
    name: "ShareDialog",
    props: {
      item: Object
    },
    watch: {
      dialog(val) {
        if (val) {
          this.shareUrl = '';
          this.$nextTick(() => this.$refs.sharePassword.focus());
        }
      }
    },
    data: () => ({
      shareUrl: '',
      password: '',
      weeksValid: 2
    }),
    methods: {
      async share() {
        const url = (await this.$axios.post(`/assets/${this.item._id}/share-url`, {
          password: this.password,
          weeksValid: this.weeksValid
        })).data.split('/');

        this.password = '';

        this.shareUrl = `${location.origin}${this.$router.resolve({
          name: 'player',
          params: {
            assetId: this.item._id,
            timestamp: url[1],
            signature: url[2]
          }
        }).href}`;
      },

      copyShareUrl() {
        setClipboard(this.shareUrl);
        events.emit('toast', 'URL copied successfully');
      }
    }
  }
</script>

<style scoped>
  pre.ellipsis {
    text-overflow: ellipsis;
    overflow: hidden;
    flex-grow: 1;
  }

  .flex {
    display: flex;
  }
</style>