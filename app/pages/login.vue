<!--
  - VAEM - Asset manager
  - Copyright (C) 2026  Wouter van de Molengraft
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

<script setup lang="ts">
const authStore = useAuthStore()
const api = useAPI()
const route = useRoute()

const error = ref(false)
const defaultRoute = '/assets'

onMounted(async () => {
  try {
    const token = (await api<{ access_token: string }>('/auth/google', {
      method: 'POST',
      body: {
        code: route.query.code,
        redirect_uri: authStore.getRedirectUri(),
      },
    })).access_token

    authStore.setToken(token)
    const redirectTo = sessionStorage.getItem('redirectTo')
    sessionStorage.removeItem('redirectTo')
    navigateTo(redirectTo === '/' || redirectTo === undefined
      ? defaultRoute
      : redirectTo,
    )
  }
  catch (e) {
    console.error(e)
    error.value = true
  }
})
</script>

<template>
  <v-container>
    <v-progress-circular
      v-if="!error"
      indeterminate
    />
    <div v-else>
      <v-alert
        color="error"
        border="start"
      >
        An error occurred.
      </v-alert>
      <v-btn
        to="/"
        class="mt-5"
        color="primary"
      >
        Retry
      </v-btn>
    </div>
  </v-container>
</template>
