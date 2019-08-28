<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-title>
        <span>Advanced add to queue</span>
      </v-card-title>
      <v-form @submit.prevent="addToQueue">
        <v-card-text>
          <v-text-field v-model="skip" label="Skip"/>
          <v-text-field v-model="videoFilter" label="Video filter"/>
          <v-text-field v-model="audio" label="Separate audio"/>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn @click="dialog=false">Cancel</v-btn>
          <v-btn color="primary" type="submit">OK</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script>
  export default {
    name: 'AddToQueueDialog',
    props: {
      item: Object,
      value: Boolean
    },
    data: () => ({
      dialog: false,
      skip: '',
      videoFilter: '',
      audio: ''
    }),
    watch: {
      value(val) {
        this.dialog = val;
      },

      dialog(val) {
        this.$emit('input', val);
      }
    },
    methods: {
      async addToQueue() {
        await this.$axios.post('/encoders/start-job', {
          fileId: this.item._id,
          audio: this.audio,
          vf: this.videoFilter,
          ss: this.skip
        });
        this.dialog = false;
      }
    },
    mounted() {
      this.$emit('input', this.dialog);
    }
  }
</script>

<style scoped>

</style>