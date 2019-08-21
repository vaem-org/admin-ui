<template>
  <v-app>
    <v-navigation-drawer
      fixed
      v-model="drawer"
      app
    >
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title>Asset manager</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
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
  </v-app>
</template>

<script>
export default {
  name: 'App',
  data: () => ({
    drawer: true
  }),
};
</script>
