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
  <v-container>
    <item-list
      ref="items"
      v-model="items"
      url="/assets"
      :headers="headers"
      :populate="['job']"
      :filter="filter"
    >
      <template #filters>
        <v-combobox
          v-model="labels"
          :items="availableLabels"
          label="Labels"
          multiple
          chips
          deletable-chips
        />
      </template>

      <template #[`item.ffprobe.format.duration`]="{ item }">
        {{ item.ffprobe.format.duration | duration }}
      </template>
      <template #[`item.createdAt`]="{ item } ">
        {{ item.createdAt | date }}
      </template>
      <template #[`item.public`]="{ item }">
        {{ item.public ? 'yes' : 'no' }}
      </template>
      <template #[`item.labels`]="{ item }">
        <v-chip
          v-for="label of item.labels"
          :key="`${item._id}-${label}`"
          class="ma-1"
        >
          {{ label }}
        </v-chip>
      </template>
      <template #[`item.subtitles`]="{ item }">
        {{ Object.keys(item.subtitles || {}).length > 0 ? 'yes' : 'no' }}
      </template>
      <template #[`item.progress`]="{ item }">
        <v-progress-linear
          v-bind="progress(item)"
        />
      </template>
      <template #[`item.eta`]="{ item }">
        <div
          v-if="!['completed','verified'].includes(item.state)"
          class="text-no-wrap"
        >
          <v-icon
            small
          >
            mdi-clock-outline
          </v-icon>
          {{ item | eta }}
        </div>
      </template>
      <template #contextMenu="{ item }">
        <v-list>
          <v-list-item
            v-if="Object.keys(item.subtitles ?? {}).length > 0"
            @click="editSubtitle(item)"
          >
            <v-list-item-title>Edit subtitle</v-list-item-title>
          </v-list-item>
          <v-list-item @click="infoDialog=true">
            <v-list-item-title>Show info</v-list-item-title>
          </v-list-item>
          <v-list-item @click="copyStreamUrl(item)">
            <v-list-item-title>Copy stream url</v-list-item-title>
          </v-list-item>
          <v-list-item @click="copyId(item)">
            <v-list-item-title>Copy id</v-list-item-title>
          </v-list-item>
          <v-list-item @click="remove([item])">
            <v-list-item-title>Remove</v-list-item-title>
          </v-list-item>
        </v-list>
      </template>
      <v-btn
        :disabled="items.length !== 1 || items[0].state !== 'verified'"
        @click="preview(items[0])"
      >
        Preview
      </v-btn>
      <v-btn
        :disabled="items.length !== 1 || items[0].state !== 'verified'"
        @click="download(items[0])"
      >
        Download
      </v-btn>
      <v-btn
        :disabled="items.length !== 1 || items[0].state !== 'verified'"
        @click="shareAssetDialog = true"
      >
        Share
      </v-btn>
      <v-btn
        :disabled="items.length !== 1 || items[0].state !== 'verified'"
        @click="embed"
      >
        Embed
      </v-btn>
      <v-btn
        :disabled="items.length === 0"
        @click="remove(items)"
      >
        Remove
      </v-btn>
      <v-btn
        :loading="exporting"
        :disabled="exporting"
        @click="exportItems"
      >
        Export
      </v-btn>
    </item-list>
    <v-dialog
      v-if="$vuetify.breakpoint.xsOnly"
      v-model="dialog"
      fullscreen
    >
      <nuxt-child
        :source="items[0]"
        @saved="$refs.items.update();"
        @close="dialog=false"
      />
    </v-dialog>
    <v-navigation-drawer
      v-else
      width="400"
      permanent
      app
      right
    >
      <nuxt-child
        :source="items[0]"
        @saved="$refs.items.update()"
      />
    </v-navigation-drawer>
    <v-dialog v-model="infoDialog" width="600px">
      <v-card>
        <v-card-text>
          <tree-view
            :data="items[0]"
            class="py-3"
            :options="{ maxDepth: 1 }"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
    <dialog-share-asset
      v-model="shareAssetDialog"
      :item="items[0] || {}"
    />
    <dialog-embed-asset
      v-model="embedDialog"
      :item="items[0] || {}"
    />
    <dialog-player
      v-model="previewDialog"
      :asset-id="previewAsset"
    />
    <dialog-subtitle-edit
      v-model="editSubtitleDialog"
      :asset="editSubtitleAsset"
      @webvtt="saveWebVtt"
    />
  </v-container>
</template>

<script>
import { TreeView } from 'vue-json-tree-view'
import setClipboard from 'assets/set-clipboard'
import dayjs from 'dayjs'

export default {
  name: 'AssetsPage',
  components: {
    TreeView
  },
  filters: {
    eta (item) {
      if (['verified', 'completed'].includes(item.state)) {
        return ''
      }

      const { startedAt, progress } = item.job ?? {}
      const duration = parseFloat(item.ffprobe?.format?.duration ?? '0')
      const eta = dayjs().add((dayjs().diff(startedAt, 'seconds') / progress) * (duration - progress), 'seconds')

      return eta.isValid() ? eta.format('HH:mm') : ''
    }
  },
  async asyncData ({ app }) {
    return {
      availableLabels: await app.$axios.$get('assets/distinct/labels')
    }
  },
  data () {
    return {
      labels: [],
      availableLabels: [],
      items: this.$route.params.id ? [{ _id: this.$route.params.id }] : [],
      dialog: false,
      infoDialog: false,
      shareAssetDialog: false,
      embedDialog: false,
      previewAsset: '',
      previewDialog: false,
      exporting: false,
      headers: [
        { text: 'Title', value: 'title' },
        { text: 'Public', value: 'public' },
        { text: 'Labels', value: 'labels' },
        { text: 'Progress', value: 'progress' },
        { text: 'ETA', value: 'eta' },
        { text: 'Date', value: 'createdAt' },
        { text: 'Duration', value: 'ffprobe.format.duration' },
        { text: 'Subtitles', value: 'subtitles' }
      ],
      editSubtitleDialog: false,
      editSubtitleAsset: null
    }
  },
  head () {
    return {
      title: 'Assets'
    }
  },
  computed: {
    filter () {
      return this.labels.length > 0
        ? {
            labels: {
              $all: this.labels
            }
          }
        : {}
    }
  },
  watch: {
    async items (value) {
      try {
        if (value.length === 1) {
          this.dialog = true
          await this.$router.replace({
            name: 'assets-id',
            params: {
              id: value[0]._id
            }
          })
        } else {
          await this.$router.replace({
            name: 'assets'
          })
        }
      } catch (e) {
        // ignore navigation errors
      }
    }
  },
  mounted () {
    this.timer = setInterval(async () => {
      const ids = this.$refs.items.items
        .filter(({ state }) => state !== 'verified')
        .map(({ _id }) => _id)

      if (ids.length === 0) {
        return
      }

      // update progress for items that are not completed yet
      for (const { _id, state, job: { progress } } of await this.$axios.$get('/assets/progress', {
        params: {
          ids: ids.join(',')
        }
      })) {
        const item = this.$refs.items.items.find(({ _id: listId }) => listId === _id)
        if (item) {
          await this.$refs.items.update({
            item: {
              ...item,
              state,
              job: {
                ...item.job,
                progress
              }
            }
          })
        }
      }
    }, 10000)
  },
  destroyed () {
    clearInterval(this.timer)
  },
  methods: {
    progress (item) {
      const complete = ['processed', 'verified'].includes(item.state)
      return {
        value: complete ? 100 : (item.job?.progress / item.ffprobe.format.duration * 100),
        color: item.state === 'verified' ? 'success' : 'primary'
      }
    },
    copyId ({ _id }) {
      setClipboard(_id)
    },
    async remove (items) {
      if (!await this.$dialog.confirm({
        text: 'Are you sure you want to delete the selected assets?',
        title: 'Remove assets'
      })) {
        return
      }

      for (const { _id } of items) {
        await this.$axios.$put(`assets/${_id}`, {
          deleted: true
        })
      }
      return this.$refs.items.update()
    },
    async download ({ _id }) {
      location.href = await this.$sign(`/assets/${_id}/download`)
    },
    async embed () {
      const item = this.items[0]
      if (!item.public) {
        if (await this.$dialog.confirm({
          text: 'Asset is private. Do you want to set it to public?',
          title: 'Embed asset'
        })) {
          await this.$axios.$put(`/assets/${item._id}`, {
            public: true
          })
          await this.$refs.items.update({ ...item, public: true })
        } else {
          return
        }
      }

      this.embedDialog = true
    },
    preview ({ _id }) {
      this.previewAsset = _id
      this.previewDialog = true
    },
    async copyStreamUrl ({ _id }) {
      const { stream } = await this.$axios.$get(`/assets/${_id}/stream`)
      setClipboard(stream)
    },
    async exportItems () {
      this.exporting = true
      try {
        await this.$refs.items.exportItems({
          filenamePrefix: 'assets',
          itemModifier: ({
            _id,
            createdAt,
            title,
            labels,
            ffprobe,
            subtitles = {}
          }) => ({
            id: _id,
            createdAt: new Date(createdAt),
            title,
            labels: labels.join(', '),
            duration: ffprobe?.format?.duration,
            subtitles: Object.entries(subtitles)
              .filter(([, enabled]) => enabled)
              .map(([language]) => language)
              .join(', ')
          })
        })
      } finally {
        this.exporting = false
      }
    },
    editSubtitle (item) {
      this.editSubtitleAsset = item
      this.editSubtitleDialog = true
    },
    async saveWebVtt ({ webVtt, assetId, language }) {
      await this.$axios.$put(`/assets/${assetId}/subtitles/${language}/${language}.vtt`, webVtt)
      this.editSubtitleDialog = false
    }
  }
}
</script>
