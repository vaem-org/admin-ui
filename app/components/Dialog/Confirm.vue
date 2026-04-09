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
const dialog = ref(false)

const title = ref('')
const message = ref('')

const nuxtApp = useNuxtApp()

nuxtApp.vueApp.provide(ConfirmKey, confirm)

let resolve: (result: boolean) => void
function confirm(_title: string, _message: string): Promise<boolean> {
  title.value = _title
  message.value = _message
  dialog.value = true
  return new Promise<boolean>((_resolve) => {
    resolve = _resolve
  })
}

function submit() {
  dialog.value = false
  resolve(true)
}

function cancel() {
  dialog.value = false
  resolve(false)
}
</script>

<template>
  <v-dialog
    v-model="dialog"
    max-width="400"
  >
    <v-card>
      <v-form
        @submit.prevent="submit"
      >
        <v-card-title>
          {{ title }}
        </v-card-title>
        <v-card-text>
          {{ message }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            type="button"
            @click="cancel"
          >
            No
          </v-btn>
          <v-btn
            type="submit"
            color="primary"
          >
            Yes
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>
