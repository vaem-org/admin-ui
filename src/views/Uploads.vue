<template>
  <v-container>
    <item-list :headers="headers" url="/uploads" v-model="items">
      <v-btn text tile color="primary">Upload</v-btn>
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
    })
  }
</script>

<style scoped>

</style>