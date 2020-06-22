<!--
  - VAEM - Asset manager
  - Copyright (C) 2019  Wouter van de Molengraft
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU General Public License as published by
  - the Free Software Foundation, either version 3 of the License, or
  - (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU General Public License for more details.
  -
  - You should have received a copy of the GNU General Public License
  - along with this program.  If not, see <https://www.gnu.org/licenses/>.
  -->

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
          <v-switch
            v-model="copyMaxVariant"
            label="Copy maximum variant without transcoding"
            hint="Use when restoring from backups"
            persistent-hint
          />
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
  import Dialog from '@/mixins/Dialog';

  export default {
    extends: Dialog,

    name: 'AddToQueueDialog',
    props: {
      item: Object
    },
    data: () => ({
      skip: '',
      videoFilter: '',
      audio: '',
      copyMaxVariant: false
    }),
    methods: {
      async addToQueue() {
        await this.$axios.post('/encoders/start-job', {
          fileId: this.item._id,
          audio: this.audio,
          vf: this.videoFilter,
          ss: this.skip,
          copyMaxVariant: this.copyMaxVariant
        });
        this.dialog = false;
      }
    }
  }
</script>

<style scoped>

</style>
