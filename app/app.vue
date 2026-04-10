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
import '@vaem/player/style.css'

const authStore = useAuthStore()
const route = useRoute()

await authStore.initialise()

if (!authStore.token && route.name !== 'login') {
  await authStore.login()
}
else if (route.fullPath === '/') {
  await navigateTo('/assets')
}

const items: {
  title: string
  to: string
  icon: string
}[] = [
  {
    title: 'Assets',
    icon: 'mdi-video',
    to: '/assets',
  },
  {
    title: 'Uploads',
    icon: 'mdi-folder',
    to: '/uploads',
  },
]
</script>

<template>
  <v-app v-if="authStore.token || route.name === 'login'">
    <c-snackbar />
    <dialog-confirm />
    <v-navigation-drawer
      location="start"
      floating
    >
      <v-list nav>
        <v-list-item
          v-for="item of items"
          :key="item.to"
          :to="item.to"
          :title="item.title"
          :prepend-icon="item.icon"
        />
      </v-list>
    </v-navigation-drawer>
    <div class="fill-height mx-5">
      <nuxt-page />
    </div>
  </v-app>
</template>
