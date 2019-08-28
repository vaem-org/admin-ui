<template>
  <v-container class="login">
    <v-btn color="primary" @click="login">Login</v-btn>
  </v-container>
</template>

<script>
import config from '@/config';

export default {
  name: 'login',
  data: () => ({
    iframe: false
  }),
  async mounted() {
    if (localStorage.getItem('token')) {
      await this.$router.push({name: 'assets'});
    }
  },
  methods: {
    login() {
      const width = 450;
      const height = 500;
      this.popup = window.open(
        `${config.apiUrl}/login/google`, 'login',
        'menubar=0,toolbar=0,personalbar=0,' +
        `width=${width},height=${height},left=${(screen.width-width)/2},top=${(screen.height-height)/2}`
      );
      window.addEventListener('message', this.receiveMessage);
    },

    receiveMessage(event) {
      if (event.data.token) {
        localStorage.setItem('token', event.data.token);
        this.popup.close();
      }
    }
  },
  destroyed() {
    window.removeEventListener('message', this.receiveMessage);
  }
}
</script>
