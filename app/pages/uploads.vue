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
import type { DataTableHeader } from 'vuetify/framework'
import dayjs from 'dayjs'
import bytes from 'bytes'
import { FetchError } from 'ofetch'

import type { File as FileItem } from '~/types/File.js'
import type { Job } from '~/types/Job.js'
import type { ComponentExposed } from 'vue-component-type-helpers'
import type { CItemList } from '#components'
import type { FFProbe } from '~/types/ffmpeg.js'

const api = useAPI()
const snackbarStore = useSnackbarStore()
const confirm = useConfirm()
const sign = useSign()
const config = useRuntimeConfig().public
const authStore = useAuthStore()

const selected = ref<FileItem[]>([])
const itemsRef = useTemplateRef<ComponentExposed<typeof CItemList<FileItem>>>('items')

const headers: DataTableHeader[] = [
  {
    title: 'Name',
    value: 'name',
    sortable: true,
  },
  {
    title: 'Updated at',
    value: 'updatedAt',
    nowrap: true,
    sortable: true,
  },
  {
    title: 'Size',
    value: 'size',
    sortable: true,
  },
  {
    title: 'Type',
    value: 'type',
    sortable: true,
  },
  {
    title: 'Progress',
    value: 'progress',
  },
]

const resume = ref(false)

const onlyVideo = computed(() => selected.value.every(file => file.type === 'video'))
const allReady = computed(() => selected.value.every(isReady))

function isReady(file: FileItem) {
  return !file.sourceSize || file.sourceSize === file.size
}

function onInput(event: Event) {
  if (!(event.target instanceof HTMLInputElement) || !event.target.files) {
    return
  }

  return upload([...event.target.files])
}

async function encode(items: FileItem[]) {
  let done = 0
  const failed = []
  for (const { _id, name } of items) {
    try {
      const job = await api<Job>(`files/${_id}/encode`, {
        method: 'POST',
      })
      done += job.state === 'done' ? 1 : 0
    }
    catch (_e) {
      failed.push(name)
    }
  }

  if (failed.length > 0) {
    snackbarStore.setError(`The following files failed: ${failed.join(', ')}`)
  }
  else {
    const name = items.length === 1 ? 'Asset' : 'Assets'
    if (done === items.length) {
      snackbarStore.setSuccess(`${name} created successfully`)
    }
    else {
      snackbarStore.setInfo(`${name} already encoded`)
    }
  }
}

const selectedItem = ref<FileItem>()
const assignToAssetDialog = ref(false)
function assignToAsset(item?: FileItem) {
  if (!item) {
    return
  }

  selectedItem.value = item
  assignToAssetDialog.value = true
}

async function remove(items: FileItem[]) {
  if (!(await confirm('Remove', `Are you sure you want to remove ${items.length > 1
    ? 'these files'
    : `"${items[0]?.title}"`
  }?`))) {
    return
  }

  for (const { _id } of items) {
    await api(`files/${_id}`, {
      method: 'DELETE',
    })
  }

  await itemsRef.value?.refresh?.()
}

const advancedEncodeDialog = ref(false)
function advancedEncode(item?: FileItem) {
  if (!item) {
    return
  }

  selectedItem.value = item
  advancedEncodeDialog.value = true
}

const editAndAssignToAssetDialog = ref(false)
const editAndAssignToAssetUrl = ref('')
function editAndAssignToAsset(item?: FileItem) {
  if (!item) {
    return
  }

  selectedItem.value = item
  editAndAssignToAssetUrl.value = /\.vtt$/i.exec(item.name)
    ? `/files/${item._id}/download`
    : `/files/${item._id}/convert.vtt`
  editAndAssignToAssetDialog.value = true
}

const ffprobe = ref<FFProbe | unknown>()
const ffprobeDialog = ref(false)
async function showInfo(item?: FileItem) {
  if (!item) {
    return
  }

  ffprobe.value = undefined
  try {
    ffprobe.value = await api<FFProbe>(`files/${item._id}/ffprobe`)
  }
  catch (e) {
    if (e instanceof FetchError) {
      ffprobe.value = e.response?._data
    }
    ffprobe.value = 'An unknown error occurred'
  }
  ffprobeDialog.value = true
}

async function download(item?: FileItem) {
  if (!item) {
    return
  }

  location.href = await sign(`files/${item._id}/download`)
}

const savingSubtitle = ref(false)
async function saveSubtitle({ webVtt, assetId, language }: {
  webVtt: string
  assetId: string
  language: string
}) {
  savingSubtitle.value = true
  try {
    await api(`assets/${assetId}/subtitles/${language}/${language}.vtt`, {
      method: 'PUT',
      body: webVtt,
      headers: {
        'content-type': 'text/vtt',
      },
    })
    editAndAssignToAssetDialog.value = false
  }
  catch (e) {
    console.error(e)
    const message = e instanceof FetchError
      ? e.response?._data?.message
      : undefined
    snackbarStore.setError(message ?? 'An error occurred')
  }
  savingSubtitle.value = false
}

const queue: {
  file: File
  _id: string
}[] = []

const uploading = ref(false)
async function upload(sourceFiles: File[]) {
  // check for existing files
  const files: Record<string, { _id: string, start: number }>
    = Object.fromEntries(
      (await api<FileItem[]>('files', {
        query: {
          filter: JSON.stringify({
            name: {
              $in: [...sourceFiles].map(({ name }) => name),
            },
          }),
        },
      })).map((file: FileItem) => [file.name, {
        _id: file._id,
        start: file.size,
      }]),
    )

  // prepare queue
  for (const file of sourceFiles) {
    const { _id } = files[file.name] || {}
    queue.push({
      file,
      _id: _id ?? (await api<FileItem>('/files', {
        method: 'POST',
        body: {
          name: file.name,
          sourceSize: file.size,
        },
      }))._id,
    })
  }
  await itemsRef.value?.refresh?.()
  if (!uploading.value) {
    uploadNext().catch((e) => {
      console.warn(`Error uploading file: ${e.toString()}`)
    })
  }
}

class AbortError extends Error {}

const uploadProgress = ref<Record<string, {
  loaded: number
  total: number
}>>({})

async function uploadNext() {
  if (queue.length === 0) {
    return
  }

  uploading.value = true
  resume.value = false
  const { file, _id } = queue.shift()!

  let tries = 10
  let done = false
  let prevStart = 0
  while (!done && tries > 0) {
    const request = new XMLHttpRequest()

    try {
      const { size: start } = await api<FileItem>(`files/${_id}/upload`)
      if (start - prevStart > 1000) {
        // reset tries if there is still progression
        tries = 10
      }
      prevStart = start

      request.open('PUT', new URL(`files/${_id}/upload/${start}`, config.apiUrl))
      request.setRequestHeader('content-type', file.type)
      request.setRequestHeader('authorization', `Bearer ${authStore.token}`)
      request.send(file)

      uploadProgress.value[_id] = {
        loaded: start,
        total: file.size,
      }

      request.addEventListener('progress', (event: ProgressEvent) => {
        uploadProgress.value[_id]!.loaded = start + event.loaded
      })

      await new Promise<void>((resolve, reject) => {
        request.addEventListener('loadend', () => {
          uploadProgress.value[_id]!.loaded = uploadProgress.value[_id]?.total ?? 0
          resolve()
        })
        request.addEventListener('error', reject)
        request.addEventListener('abort', () => reject(new AbortError()))
      })

      done = true
    }
    catch (e) {
      if (!(e instanceof AbortError)) {
        // retry
        tries--
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log(`Retrying upload (${tries} tries left)`)
      }
      else {
        done = true
      }
    }
  }

  if (!done) {
    snackbarStore.setError('An error occurred during upload')
    queue.unshift({
      _id,
      file,
    })
    resume.value = true
  }

  await refreshNuxtData()

  if (done && queue.length > 0) {
    await uploadNext()
  }
  else {
    uploading.value = false
  }
}

function progress(item: FileItem): {
  modelValue: number
  color: string
} {
  const currentProgress = uploadProgress.value[item._id]
  const completeness = currentProgress
    ? currentProgress.loaded / currentProgress.total
    : item.size / (item.sourceSize === 0 ? item.size : item.sourceSize)

  return {
    modelValue: completeness * 100,
    color: completeness === 1 ? 'green' : 'blue',
  }
}

function onDragOver(event: DragEvent) {
  if (!event.dataTransfer || event.dataTransfer.files.length === 0) {
    return
  }

  event.dataTransfer.dropEffect = 'copy'
}

function onDrop(event: DragEvent) {
  if (!event.dataTransfer) {
    return
  }
  upload([...event.dataTransfer.files])
}
</script>

<template>
  <v-main
    class="fill-height"
    @dragover.prevent="onDragOver"
    @drop.prevent="onDrop"
  >
    <c-item-list
      ref="items"
      v-model="selected"
      url="files"
      :headers="headers"
      default-sort="-updatedAt"
    >
      <template #toolbar>
        <v-btn
          v-if="!resume"
          tag="div"
          class="upload"
        >
          Upload
          <input
            type="file"
            multiple
            @change="onInput"
          >
        </v-btn>
        <v-btn
          v-else
          color="warning"
          @click="uploadNext"
        >
          Resume
        </v-btn>
        <v-btn
          :disabled="selected.length === 0 || !onlyVideo || !allReady"
          @click="encode(selected)"
        >
          Encode
        </v-btn>
        <v-btn
          :disabled="selected.length !== 1 || selected[0]?.type !== 'subtitle'"
          @click="assignToAsset(selected[0])"
        >
          Assign to asset
        </v-btn>
        <v-btn
          :disabled="selected.length === 0"
          @click="remove(selected)"
        >
          Remove
        </v-btn>
      </template>
      <template #contextMenu="{ item }">
        <v-list>
          <v-list-item
            v-if="item.type==='video' && isReady(item)"
            title="Advanced encode"
            @click="advancedEncode(item)"
          />
          <v-list-item
            v-if="item.type==='subtitle'"
            title="Assign to asset"
            @click="assignToAsset(item)"
          />
          <v-list-item
            v-if="item.type==='subtitle'"
            title="Edit and assign to asset"
            @click="editAndAssignToAsset(item)"
          />
          <v-list-item
            title="Show info"
            @click="showInfo(item)"
          />
          <v-list-item
            v-if="isReady(item)"
            title="Download"
            @click="download(item)"
          />
          <v-list-item
            title="Remove"
            @click="remove([item])"
          />
        </v-list>
      </template>
      <template #[`item.size`]="{ value, item }">
        {{ bytes(uploadProgress[item._id]?.loaded ?? value) }}
      </template>
      <template #[`item.updatedAt`]="{ value }">
        {{ dayjs(value).format('YYYY-MM-DD HH:mm:ss') }}
      </template>
      <template #[`item.progress`]="{ item }">
        <v-progress-linear
          v-bind="progress(item)"
        />
      </template>
    </c-item-list>
    <dialog-assign-to-asset
      v-if="selectedItem"
      v-model="assignToAssetDialog"
      :file="selectedItem"
    />
    <dialog-advanced-encode
      v-if="selectedItem"
      v-model="advancedEncodeDialog"
      :file="selectedItem"
    />
    <dialog-subtitle-edit
      v-model="editAndAssignToAssetDialog"
      :url="editAndAssignToAssetUrl"
      :saving="savingSubtitle"
      @save="saveSubtitle"
    />
    <v-dialog
      v-model="ffprobeDialog"
      width="1024"
    >
      <v-card>
        <v-card-text>
          <v-skeleton-loader
            v-if="ffprobe === undefined"
            type="article"
          />
          <c-tree-view
            :value="ffprobe"
            :options="{ rootObjectKey: selectedItem?.name }"
            class="py-3"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-main>
</template>

<style scoped lang="scss">
.upload {
  position: relative;
  overflow: hidden;

  :deep(.v-btn__content) {
    position: static;
  }

  input {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    top: 0;
    margin-left: -140px;
    width: calc(100% + 140px);
    opacity: 0;
    cursor: pointer;
  }
}
</style>
