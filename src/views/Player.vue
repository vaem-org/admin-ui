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
  <v-container v-if="!streamInfo">
    <login-form :error="error" @login="login"/>
  </v-container>
  <vaem-player v-else :item="streamInfo" fullscreen/>
</template>

<script>
  import VaemPlayer from '@/components/VaemPlayer';
  import get from 'lodash/get';
  import LoginForm from '@/components/LoginForm';

  export default {
    name: 'Player',
    components: { LoginForm, VaemPlayer },
    data: () => ({
      streamInfo: null,
      error: null
    }),
    methods: {
      async login({ password }) {
        this.error = null;
        const params = this.$route.params;
        try {
          this.streamInfo = (await this.$axios.post(
            `/assets/${params.assetId}/share-info/${params.timestamp}/${params.signature}`,
            {
              password
            }
          )).data;
        }
        catch (e) {
          this.error = get(e, 'response.data.message', e.toString());
        }
      }
    }
  }
</script>

<style scoped>

</style>