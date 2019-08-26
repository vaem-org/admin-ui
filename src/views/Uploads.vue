<template>
  <v-container>
    <item-list :headers="headers" url="/uploads" v-model="items">
      <v-btn text tile color="primary">Upload</v-btn>
      <v-btn text tile color="primary" :disabled="items.length===0" @click="addToQueue">Add to queue</v-btn>
      <template v-slot:item.size="{ item }">
        {{ item.size | bytes }}
      </template>
      <template v-slot:item.createdAt="{ item }">
        {{ item.createdAt | date }}
      </template>
    </item-list>
  </v-container>
</template>

<script>
  import ItemList from '../components/ItemList';

  export default {
    name: 'Uploads',
    components: { ItemList },
    data: () => ({
      headers: [
        { text: 'Name', value: 'name' },
        { text: 'Created at', value: 'createdAt' },
        { text: 'Size', value: 'size' }
      ],
      items: []
    }),
    methods: {
      async addToQueue() {
        for(let upload of this.items) {
          await this.$axios.post('/encoders/start-job', {
            fileId: upload._id
          });
        }
      }
    }
  }
</script>

<style scoped>

</style>