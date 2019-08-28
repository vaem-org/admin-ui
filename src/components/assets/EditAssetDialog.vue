<template>
  <v-dialog v-model="dialog" max-width="600px">
    <v-card>
      <v-form @submit.prevent="saveItem">
        <v-card-title>
          <span>Edit asset</span>
        </v-card-title>
        <v-card-text>
          <v-text-field label="Title" v-model="item.title"/>
          <v-combobox label="Labels" v-model="item.labels" tags chips deletable-chips :items="labels" multiple autocomplete="off"/>
          <v-switch label="Public" v-model="item.public"/>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn @click="dialog=false">Cancel</v-btn>
          <v-btn type="submit" color="primary">Save</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script>
  import pick from 'lodash/pick';

  export default {
    name: 'EditAssetDialog',
    props: {
      value: Boolean,
      item: Object
    },
    data: () => ({
      dialog: false,
      labels: []
    }),
    watch: {
      async value(val) {
        if (val) {
          this.labels = (await this.$axios.get('/assets/labels')).data;
          this.dialog = true;
        } else {
          this.dialog = false;
        }
      },

      dialog(value) {
        this.$emit('input', value);
      }
    },
    methods: {
      async saveItem() {
        await this.$axios.post(`/assets/${this.item._id}`, pick(this.item, [
          'title',
          'labels',
          'public'
        ]));
        this.dialog = false;
        this.$emit('saved');
      }
    },
    mounted() {
      this.$emit('input', this.dialog);
    }
  }
</script>

<style scoped>

</style>