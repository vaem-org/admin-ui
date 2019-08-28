<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-text>
        Hello world!
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
  import Dialog from '@/mixins/Dialog';

  export default {
    extends: Dialog,
    name: 'EmbedDialog'
  }
</script>

<style scoped>

</style>