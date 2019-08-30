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