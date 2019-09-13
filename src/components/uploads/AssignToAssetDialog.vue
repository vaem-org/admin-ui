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
  <v-dialog v-model="dialog" max-width="500px" :persistent="loading">
    <v-card>
      <v-card-title>
        <span>Assign <strong>{{ item.name | basename }}</strong> to asset.</span>
      </v-card-title>
      <v-form @submit.prevent="assignToAsset" v-model="valid" lazy-validation ref="form">
        <v-card-text>
          <v-autocomplete
            label="Asset"
            v-model="asset"
            :items="assets"
            item-text="title"
            item-value="_id"
            :rules="[v => !!v || 'Please select an asset']"
            browser-autocomplete="off"
          />
          <v-select
            label="Language"
            v-model="language"
            :items="languages"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn @click="dialog = false" :disabled="loading">Cancel</v-btn>
          <v-btn type="submit" color="primary" :loading="loading">OK</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script>
  import { languages } from '@/defaults';
  import Dialog from '@/mixins/Dialog';

  export default {
    extends: Dialog,
    name: 'AssignToAssetDialog',
    props: {
      item: Object
    },
    data: () => ({
      asset: null,
      assets: [],

      language: languages[0],
      languages,

      loading: false,
      valid: false
    }),
    methods: {
      async assignToAsset() {
        if (!this.$refs.form.validate()) {
          return;
        }
        this.loading = true;
        try {
          await this.$axios.post(`uploads/${this.item._id}/assign-to/${this.language}/${this.asset}`);
          this.loading = false;
          this.dialog = false;
        }
        catch (e) {
          console.error(e);
          this.loading = false;
        }
      },

      async initDialog() {
        this.assets = (await this.$axios.get('/uploads/assets')).data;
      }
    }
  }
</script>

<style scoped>

</style>