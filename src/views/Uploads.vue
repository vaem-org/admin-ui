<template>
  <v-container>
    <v-data-table :headers="headers" :items="items" class="elevation-1"/>
  </v-container>
</template>

<script>
  export default {
    name: 'Uploads',
    data: () => ({
      items: [],
      headers: [
        { text: 'Name', value: 'name' },
        { text: 'Created at', value: 'createdAt' },
        { text: 'Size', value: 'size' }
      ]
    }),
    async mounted() {
      const { data } = await this.$axios.get('/uploads');
      this.items = data.items;
    }
  }
</script>

<style scoped>

</style>