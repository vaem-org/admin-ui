<template>
  <v-container>
    <v-data-table :headers="headers" :items="items"/>
  </v-container>
</template>

<script>
  export default {
    name: 'Assets',
    data: () => ({
      items: [],
      headers: [
        { text: 'Title', value: 'title' },
        { text: 'Labels', value: 'labels' },
        { text: 'State', value: 'state' },
      ]
    }),

    async mounted() {
      const { data } = await this.$axios.get('/assets');

      this.items = data.items;
    }
  }
</script>

<style scoped>

</style>