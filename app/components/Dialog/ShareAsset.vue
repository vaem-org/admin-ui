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
import type { Asset } from '~/types/Asset.js'
import type { SubmitEventPromise } from 'vuetify/framework'
import DayjsAdapter from '@date-io/dayjs'

const props = defineProps<{
  item: Asset
}>()

const model = defineModel<boolean>({
  required: true,
})

const api = useAPI()
const config = useRuntimeConfig().public
const snackbarStore = useSnackbarStore()
const date = new DayjsAdapter()

const password = ref('')
const weeksValid = ref(2)
const formValid = ref(false)
const shareUrl = ref('')

watch(model, (value) => {
  if (!value) {
    return
  }

  password.value = ''
  weeksValid.value = 2
  shareUrl.value = ''
})

async function submit(validate: SubmitEventPromise) {
  if (!(await validate).valid) {
    return
  }

  const { timestamp, signature } = await api<{
    timestamp: number
    signature: string
  }>(`assets/${props.item._id}/share`, {
    method: 'POST',
    body: {
      password: password.value,
      expires: date.addWeeks(date.date(), weeksValid.value).valueOf(),
    },
  })
  shareUrl.value = `${config.embedUrl}/${timestamp}/${signature}/${props.item._id}`
}

const { copy, copied } = useClipboard()
watch(copied, (value) => {
  if (!value) {
    return
  }

  snackbarStore.setSuccess('URL copied')
})
</script>

<template>
  <v-dialog
    v-model="model"
    width="600"
  >
    <v-card>
      <v-card-title>
        <span>Share <em>{{ item.title }}</em></span>
      </v-card-title>
      <v-form
        v-if="!shareUrl"
        v-model="formValid"
        @submit.prevent="submit"
      >
        <v-card-text>
          <v-text-field
            v-model="password"
            label="Choose a password"
            :rules="[(v: string) => !!v || 'Please enter a password']"
            autofocus
            type="password"
          />
          <v-text-field
            v-model="weeksValid"
            label="Number of weeks valid"
            type="number"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            type="submit"
            :disabled="!formValid"
          >
            Share
          </v-btn>
        </v-card-actions>
      </v-form>
      <div v-else>
        <v-card-text>
          <div class="d-flex align-center">
            <v-text-field
              v-model="shareUrl"
              label="URL"
              readonly
              disabled
              filled
              hide-details
              dense
            />
            <v-btn
              icon="mdi-content-copy"
              class="ml-2"
              @click="copy(shareUrl)"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="model = false">
            Close
          </v-btn>
        </v-card-actions>
      </div>
    </v-card>
  </v-dialog>
</template>
