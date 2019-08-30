<template>
  <v-layout class="justify-center align-content-center">
    <v-flex class="xs12 sm6 md5">
      <v-card>
        <v-card-title><span class="title">Log in</span></v-card-title>
        <v-card-text>
          <v-form @submit.prevent="login">
            <v-text-field v-model="password" label="Password" type="password" ref="password" :rules="[v => !!v || 'Please enter a password']"
                          autofocus :error-messages="error ? [error]  : []" autocomplete="off"/>
            <v-btn type="submit" color="primary" class="ml-0 mt-3">Log in</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
  export default {
    name: 'LoginForm',
    props: {
      error: String,
    },
    data: () => ({
      password: ''
    }),
    methods: {
      login() {
        this.$emit('login', {
          password: this.password
        });
      }
    }
  }
</script>

<style scoped>

</style>