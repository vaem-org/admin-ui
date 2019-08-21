<template>
  <v-container>
    <h1>Assets</h1>
    <pre>{{ test }}</pre>
  </v-container>
</template>

<script>
  export default {
    name: 'Assets',
    data: () => ({
      test: null
    }),

    async mounted() {
      this.test = (await this.$axios.get('/assets')).data;
    }
  }
</script>

<style scoped>

</style>