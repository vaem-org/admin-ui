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
      localStorage.setItem('token', token);
      localStorage.setItem('loginProvider', this.provider);
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
    if (localStorage.getItem('token')) {
      return this.$router.push({name: 'assets'});
    }

    this.provider = (await this.$axios.get('/login')).data;
  },
  destroyed() {
    window.removeEventListener('message', this.receiveMessage);
  }
}
</script>
