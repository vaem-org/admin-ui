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
  import Dialog from '@/mixins/Dialog';
  import pick from 'lodash/pick';

  export default {
    extends: Dialog,
    name: 'EditAssetDialog',
    props: {
      item: Object
    },
    data: () => ({
      labels: []
    }),
    methods: {
      async saveItem() {
        await this.$axios.post(`/assets/${this.item._id}`, pick(this.item, [
          'title',
          'labels',
          'public'
        ]));
        this.dialog = false;
        this.$emit('saved');
      },

      async initDialog() {
        this.labels = (await this.$axios.get('/assets/labels')).data;
      }
    }
  }
</script>

<style scoped>

</style>