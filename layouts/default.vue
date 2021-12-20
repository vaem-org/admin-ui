<!--
  - VAEM - Asset manager
  - Copyright (C) 2021  Wouter van de Molengraft
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
  <v-app dark>
    <v-navigation-drawer
      v-if="$auth.loggedIn"
      v-model="drawer"
      fixed
      app
    >
      <v-list
        nav
        link
      >
        <v-list-item :to="{name: 'assets'}">
          <v-list-item-icon>
            <v-icon>mdi-video</v-icon>
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
    <v-app-bar
      v-if="$vuetify.breakpoint.mdAndDown"
      app
      fixed
    >
      <v-app-bar-nav-icon @click="drawer=!drawer" />
      <v-toolbar-title>
        VAEM
      </v-toolbar-title>
    </v-app-bar>
    <v-main>
      <Nuxt />
    </v-main>
    <v-footer
      app
    >
      <span>&copy; {{ new Date().getFullYear() }} - Vaem</span>
    </v-footer>
    <v-snackbar
      v-model="flashShow"
      :color="flashColor"
      top
    >
      {{ flashMessage }}
    </v-snackbar>
  </v-app>
</template>

<script>
import { mapState } from 'vuex'
export default {
  data () {
    return {
      drawer: true
    }
  },
  computed: {
    flashShow: {
      get () {
        return this.$store.state.flash.show
      },
      set (value) {
        this.$store.commit('flash/setShow', value)
      }
    },
    ...mapState({
      flashMessage: state => state.flash.message,
      flashColor: state => state.flash.color
    })
  }
}
</script>
