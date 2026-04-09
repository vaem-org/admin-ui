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
import type { File } from '~/types/File.js'
import type { SubmitEventPromise } from 'vuetify/framework'
import { useSnackbarStore } from '~/stores/snackbar.js'
import { languages } from '~/assets/languages.js'

const props = defineProps<{
  file: File
}>()

const model = defineModel<boolean>({
  required: true,
})

const api = useAPI()
const snackbarStore = useSnackbarStore()

const asset = ref<string | null>(null)

const language = ref<string>()

const loading = ref(false)

const name = computed(() => (props.file?.name ?? '').split('/').slice(-1)[0])

watch(model, (value) => {
  if (!value) {
    return
  }
  asset.value = null
})

async function submit(validate: SubmitEventPromise) {
  if (!(await validate).valid) {
    return
  }

  loading.value = true
  try {
    await api(`files/${props.file._id}/assign/${asset.value}/${language.value}`, {
      method: 'POST',
    })
    model.value = false
  }
  catch (e) {
    console.error(e)
    snackbarStore.setError('An error occurred')
  }
  loading.value = false
}
</script>

<template>
  <v-dialog
    v-model="model"
    width="600"
    :persistent="loading"
  >
    <v-card
      :loading="loading"
    >
      <v-card-title>
        <span>Assign <strong>{{ name }}</strong> to asset.</span>
      </v-card-title>
      <v-form
        ref="form"
        validate-on="lazy submit"
        @submit.prevent="submit"
      >
        <v-card-text>
          <input-asset
            v-model="asset"
            label="Asset"
            autofocus
            :rules="[(v: string) => !!v || 'Select an asset']"
          />
          <v-select
            v-model="language"
            label="Language"
            :items="languages"
            class="mt-3"
            :rules="[(v: string) => !!v || 'Select a language']"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            :loading="loading"
            :disabled="loading"
            type="submit"
          >
            Assign
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>
