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
  <v-app v-if="$route.meta.emptyLayout">
    <router-view/>
  </v-app>
  <v-app v-else>
    <v-navigation-drawer
      fixed
      v-model="drawer"
      app
    >
      <v-list
        nav
        link
      >
        <v-list-item :to="{name: 'assets'}">
          <v-list-item-icon>
            <v-icon>mdi-library-video</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            Assets
          </v-list-item-content>
        </v-list-item>
        <v-list-item :to="{name: 'uploads'}">
          <v-list-item-icon>
            <v-icon>mdi-folder</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            Uploads
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-content>
      <router-view/>
    </v-content>
    <v-footer app>
      <v-btn icon small :to="{path:'/encoders/'}" text class="mr-2">
        <v-icon small>mdi-server-network</v-icon>
      </v-btn>
      <span>VAEM - Asset manager</span>
      <v-spacer/>
      <span class="mr-2">&copy; {{ year }}</span>
    </v-footer>
    <v-snackbar v-model="snackbar" :timeout="4000" color="success">
      {{ snackbarText }}
    </v-snackbar>
  </v-app>
</template>

<script>
  import events from '@/events';
  import { socketio } from '@/util/socketio';

  export default {
    name: 'App',
    data: () => ({
      drawer: true,
      year: (new Date()).getFullYear(),
      snackbar: false,
      snackbarText: ''
    }),

    async mounted() {
      if (this.$route.meta.authenticated) {
        try {
          await this.$axios.get('/login/me');
        }
        catch (e) {
          localStorage.removeItem('token');
          await this.$router.push({ name: 'login' });
        }
      }

      this.io = socketio('/global');

      this.io.on('info', text => {
        this.snackbarText = text;
        this.snackbar = true;
      });

      events.on('toast', text => {
        this.snackbarText = text;
        this.snackbar = true;
      })
    }
  };
</script>
