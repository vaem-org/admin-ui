<template>
  <v-container class="login">
    <login-form @login="localLogin" :error="error" v-if="provider==='local'"/>
    <v-btn v-if="provider==='google'" color="primary" @click="googleLogin">Login</v-btn>
  </v-container>
</template>

<script>
import config from '@/config';
import LoginForm from '@/components/LoginForm';

export default {
  name: 'login',
  components: { LoginForm },
  data: () => ({
    iframe: false,
    provider: null,
    password: '',
    error: ''
  }),
  methods: {
    login({token, refreshToken}) {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('loginProvider', this.provider);
      localStorage.setItem('refreshToken', refreshToken);
      this.$router.push({name: 'assets'});
    },

    googleLogin() {
      const width = 450;
      const height = 500;
      this.popup = window.open(
        `${config.apiUrl}/login/google`, 'login',
        'menubar=0,toolbar=0,personalbar=0,' +
        `width=${width},height=${height},left=${(screen.width-width)/2},top=${(screen.height-height)/2}`
      );
      window.addEventListener('message', this.receiveMessage);
    },

    async localLogin({ password }) {
      this.error = null;
      try {
        const { data } = await this.$axios.post('/login/local', {
          password
        });

        this.login(data);
      }
      catch (e) {
        this.error = 'Unable to login';
      }
    },

    receiveMessage(event) {
      if (event.data.token) {
        this.login(event.data);
        this.popup.close();
      }
    }
  },
  async mounted() {
    if (sessionStorage.getItem('token')) {
      return this.$router.push({name: 'assets'});
    }

    this.provider = (await this.$axios.get('/login')).data;
  },
  destroyed() {
    window.removeEventListener('message', this.receiveMessage);
  }
}
</script>
