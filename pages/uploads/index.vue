<!--
  - VAEM - Asset manager
  - Copyright (C) 2022  Wouter van de Molengraft
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
  <div
    class="fill-height"
    @drop.stop.prevent="upload"
    @dragover.prevent="dragover"
  >
    <v-container>
      <item-list
        ref="items"
        v-model="items"
        :headers="headers"
        url="files"
      >
        <template #[`item.size`]="{ item }">
          {{ item.size | bytes }}
        </template>
        <template #[`item.updatedAt`]="{ item }">
          {{ item.updatedAt | date }}
        </template>
        <template #[`item.progress`]="{ item }">
          <v-progress-linear
            v-bind="progress(item)"
          />
        </template>
        <template #contextMenu="{ item }">
          <v-list>
            <v-list-item
              v-if="item.type==='video' && isReady(item)"
              @click="advancedEncode(item)"
            >
              <v-list-item-title>Advanced encode</v-list-item-title>
            </v-list-item>
            <v-list-item
              v-if="item.type==='subtitle'"
              @click="assignToAsset(item)"
            >
              <v-list-item-title>Assign to asset</v-list-item-title>
            </v-list-item>
            <v-list-item @click="showInfo(item)">
              <v-list-item-title>Show info</v-list-item-title>
            </v-list-item>
            <v-list-item
              v-if="isReady(item)"
              @click="download(item)"
            >
              <v-list-item-title>Download</v-list-item-title>
            </v-list-item>
            <v-list-item @click="remove([item])">
              <v-list-item-title>Remove</v-list-item-title>
            </v-list-item>
          </v-list>
        </template>
        <v-btn
          v-if="!resume"
          tag="div"
          class="upload"
        >
          Upload
          <input
            type="file"
            multiple
            @change="upload"
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
          :disabled="items.length !== 1 || items[0].type!=='video' || !isReady(items[0])"
          @click="preview(items[0])"
        >
          Preview
        </v-btn>
        <v-btn
          :disabled="items.length === 0 || !onlyVideo || !isReady(items[0])"
          @click="encode(items)"
        >
          Encode
        </v-btn>
        <v-btn
          :disabled="items.length !== 1 || items[0].type!=='subtitle' || !isReady(items[0])"
          @click="assignToAsset(items[0])"
        >
          Assign to asset
        </v-btn>
        <v-btn
          :disabled="items.length === 0"
          @click="remove(items)"
        >
          Remove
        </v-btn>
        <v-dialog
          v-model="ffprobeDialog"
          width="1024"
        >
          <v-card>
            <v-card-text>
              <tree-view
                :data="ffprobe"
                :options="{ rootObjectKey: items[0] && items[0].name }"
                class="py-3"
              />
            </v-card-text>
          </v-card>
        </v-dialog>
      </item-list>
    </v-container>
    <dialog-assign-to-asset
      v-model="assignToAssetDialog"
      :file="assignToAssetFile"
    />
    <dialog-advanced-encode
      v-model="advancedEncodeDialog"
      :file="advancedEncodeFile"
    />
    <dialog-preview-file
      v-model="previewDialog"
      :file="previewFile"
    />
  </div>
</template>

<script>
import { TreeView } from 'vue-json-tree-view'

export default {
  name: 'UploadsPage',
  components: {
    TreeView
  },
  data: () => ({
    headers: [
      { text: 'Name', value: 'name' },
      { text: 'Updated at', value: 'updatedAt' },
      { text: 'Size', value: 'size' },
      { text: 'Type', value: 'type' },
      { text: 'Progress', value: 'progress' }
    ],
    items: [],
    snackbar: false,
    snackbarColor: 'success',
    snackbarMessage: '',
    ffprobe: null,
    ffprobeDialog: false,
    assignToAssetFile: null,
    assignToAssetDialog: false,
    queue: [],
    uploading: false,
    resume: false,
    advancedEncodeDialog: false,
    advancedEncodeFile: null,
    previewDialog: false,
    previewFile: null
  }),
  head () {
    return {
      title: 'Uploads'
    }
  },
  computed: {
    onlyVideo () {
      return this.items.every(({ type }) => type === 'video')
    }
  },
  methods: {
    async encode (items) {
      let done = 0
      const failed = []
      for (const { _id, name } of items) {
        try {
          const job = await this.$axios.$post(`files/${_id}/encode`)
          done += job.state === 'done' ? 1 : 0
        } catch (e) {
          failed.push(name)
        }
      }

      if (failed.length > 0) {
        this.$store.commit('flash/setMessage', {
          message: `The following files failed: ${failed.join(', ')}`,
          color: 'error'
        })
      } else {
        const name = items.length === 1 ? 'Asset' : 'Assets'
        this.$store.commit('flash/setMessage', {
          message: done === items.length ? `${name} already encoded` : `${name} created successfully`,
          color: done === items.length ? 'info' : 'success'
        })
      }
    },
    async remove (items) {
      if (!await this.$dialog.confirm({
        text: 'Are you sure you want to remove the selected files?',
        title: 'Remove files'
      })) {
        return
      }

      // remove from queue and abort current upload when necessary
      this.queue = this.queue.filter(({ _id }) => items.find(({ _id: _id2 }) => _id === _id2))
      if (items.find(({ _id }) => _id === this.currentlyUploading?._id)) {
        this.currentlyUploading.cancel('AbortError')
        this.currentlyUploading = null
      }

      for (const { _id } of items) {
        await this.$axios.delete(`files/${_id}`)
      }
      return this.$refs.items.update()
    },
    async showInfo ({ _id }) {
      try {
        this.ffprobe = await this.$axios.$get(`files/${_id}/ffprobe`)
      } catch (e) {
        this.ffprobe = e.response?.data ?? 'An unknown error occurred'
      }
      this.ffprobeDialog = true
    },
    assignToAsset (item) {
      this.assignToAssetFile = item
      this.assignToAssetDialog = true
    },
    isReady ({
      size,
      sourceSize
    } = {}) {
      return size >= sourceSize
    },
    async upload ({ target, dataTransfer }) {
      // check for existing files
      const sourceeFiles = target.files ?? dataTransfer.files
      const files = (await this.$axios.$get('/files', {
        params: {
          filter: JSON.stringify({
            name: {
              $in: [...sourceeFiles].map(({ name }) => name)
            }
          })
        }
      })).reduce((files, { _id, name, size }) => ({
        ...files,
        [name]: { _id, start: size }
      }), {})

      // prepare queue
      for (const file of sourceeFiles) {
        const { _id } = files[file.name] || {}
        this.queue.push({
          file,
          _id: _id ?? (await this.$axios.$post('/files', {
            name: file.name,
            sourceSize: file.size
          }))._id
        })
      }
      await this.$refs.items.update()
      target.value = ''
      if (!this.uploading) {
        this.uploadNext().catch((e) => {
          console.warn(`Error uploading file: ${e.toString()}`)
        })
      }
    },
    async uploadNext () {
      if (this.uploading) {
        return
      }
      this.uploading = true
      this.resume = false
      const { file, _id } = this.queue.shift()
      const listItem = this.$refs.items.items.find(({ _id: listId }) => listId === _id)

      let tries = 10
      let done = false
      let prevStart = 0
      while (!done && tries > 0) {
        try {
          const { size: start } = await this.$axios.$get(`/files/${_id}/upload`)
          if (start - prevStart > 1000) {
            // reset tries if there is still progression
            tries = 10
          }
          prevStart = start
          this.currentlyUploading = {
            _id,
            file
          }
          const item = await this.$axios.$put(`/files/${_id}/upload/${start}`, file.slice(start), {
            headers: {
              'content-type': file.type
            },
            onUploadProgress: ({ loaded }) => {
              if (!listItem) {
                return false
              }
              return this.$refs.items.update({
                item: {
                  ...listItem,
                  size: loaded + start
                }
              })
            },
            cancelToken: new this.$axios.CancelToken((cancel) => {
              this.currentlyUploading = {
                _id,
                cancel
              }
            })
          })
          await this.$refs.items.update({ item })
          done = true
          this.currentlyUploading = null
        } catch (e) {
          if (e.message !== 'AbortError') {
            // retry
            tries--
            await new Promise(resolve => setTimeout(resolve, 1000))
            console.log(`Retrying upload (${tries} tries left)`)
          } else {
            done = true
          }
        }
      }

      if (!done) {
        this.$store.commit('flash/setMessage', {
          message: 'An error occurred during upload',
          color: 'error'
        })
        this.queue.unshift({
          _id,
          file
        })
        this.resume = true
      }

      if (done && this.queue.length > 0) {
        await this.uploadNext()
      } else {
        this.uploading = false
      }
    },
    progress (item) {
      return {
        value: Math.min(
          item.sourceSize ? (item.size / item.sourceSize * 100) : 100,
          100
        ),
        color: item.sourceSize === 0 || item.sourceSize === item.size ? 'success' : 'primary'
      }
    },
    dragover ({ dataTransfer }) {
      dataTransfer.dropEffect = 'copy'
    },
    async download ({ _id }) {
      location.href = await this.$sign(`/files/${_id}/download`)
    },
    advancedEncode (item) {
      this.advancedEncodeFile = item
      this.advancedEncodeDialog = true
    },
    preview (item) {
      this.previewFile = item
      this.previewDialog = true
    }
  }
}
</script>

<style scoped lang="scss">
.upload {
    position: relative;
    overflow: hidden;

  ::v-deep .v-btn__content {
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
