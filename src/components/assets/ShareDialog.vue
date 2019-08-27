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
            <pre class="ellipsis">{{ shareUrl }}</pre>
            <v-btn small icon @click="copyShareUrl">
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

  export default {
    name: "ShareDialog",
    props: {
      value: Boolean,
      item: Object
    },
    data: () => ({
      dialog: false,
      shareUrl: '',
      password: '',
      weeksValid: 2
    }),
    watch: {
      async value(val) {
        this.dialog = val;
        this.shareUrl = '';
      },

      dialog(value) {
        this.$emit('input', value);
        if (value) {
          this.$nextTick(() => this.$refs.sharePassword.focus());
        }
      }
    },
    methods: {
      async share() {
        const url = (await this.$axios.post(`/assets/${this.item._id}/share-url`, {
          password: this.password,
          weeksValid: this.weeksValid
        })).data;

        this.password = '';

        this.shareUrl = `${location.origin}/player/${this.item._id}${url}`;
      },

      copyShareUrl() {
        setClipboard(this.shareUrl);
      },
    },
    mounted() {
      this.$emit('input', this.dialog);
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