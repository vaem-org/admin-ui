<template>
  <v-container v-if="!streamInfo">
    <v-layout class="justify-center align-content-center">
      <v-flex class="xs12 sm6 md5">
        <v-card>
          <v-card-title><span class="title">Log in</span></v-card-title>
          <v-card-text>
            <v-alert v-model="error" type="error" dismissible transition="slide-y-transition">
              {{ errorText }}
            </v-alert>
            <v-form @submit.prevent="login">
              <v-text-field v-model="password" label="Password" type="password" ref="password" :rules="[v => !!v || 'Please enter a password']"
                            autofocus/>
              <v-btn type="submit" color="primary" class="ml-0">Log in</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
  <vaem-player v-else :item="streamInfo" fullscreen/>
</template>

<script>
  import VaemPlayer from '@/components/VaemPlayer';
  import get from 'lodash/get';

  export default {
    name: 'Player',
    components: { VaemPlayer },
    data: () => ({
      streamInfo: null,
      password: '',
      error: false,
      errorText: ''
    }),
    methods: {
      async login() {
        const params = this.$route.params;
        try {
          this.streamInfo = (await this.$axios.post(
            `/assets/${params.assetId}/share-info/${params.timestamp}/${params.signature}`,
            {
              password: this.password
            }
          )).data;
        }
        catch (e) {
          this.error = true;
          this.errorText = get(e, 'response.data.message', e.toString());
        }
      }
    }
  }
</script>

<style scoped>

</style>