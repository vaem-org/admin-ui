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
      <span>Asset manager</span>
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
          sessionStorage.removeItem('token');
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
