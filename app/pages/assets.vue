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
import type { DataTableHeader } from 'vuetify/framework'
import dayjs from 'dayjs'
import type { ComponentExposed } from 'vue-component-type-helpers'
import type { CItemList } from '#components'
import { useRouteQuery } from '@vueuse/router'

const api = useAPI()
const confirm = useConfirm()
const sign = useSign()

const itemsRef = useTemplateRef<ComponentExposed<typeof CItemList<Asset>>>('items')
const selected = ref<Asset[]>([])
const labels = useRouteQuery<string[]>('labels', [])

const filter = computed<Record<string, unknown> | undefined>(() => labels.value.length === 0
  ? undefined
  : {
      labels: {
        $all: labels.value,
      },
    },
)

const availableLabels = await api<string[]>('assets/distinct/labels')

const headers: DataTableHeader<Asset>[] = [
  {
    title: '',
    value: 'actions',
    sortable: false,
  },
  {
    title: 'Title',
    value: 'title',
    width: '100%',
    sortable: true,
  },
  {
    title: 'Public',
    value: 'public',
    sortable: true,
  },
  {
    title: 'Labels',
    value: 'labels',
    sortable: true,
  },
  {
    title: 'Progress',
    value: 'progress',
  },
  {
    title: 'ETA',
    value: 'eta',
  },
  {
    title: 'Date',
    value: 'createdAt',
    nowrap: true,
    sortable: true,
  },
  {
    title: 'Subtitles',
    value: 'subtitles',
  },
]

const infoDialog = ref(false)
const selectedItem = ref<Asset>()

const editSubtitleDialog = ref(false)
function editSubtitle(item: Asset) {
  selectedItem.value = item
  editSubtitleDialog.value = true
}

const previewDialog = ref(false)
function preview(item?: Asset) {
  if (!item) {
    return
  }

  selectedItem.value = item
  previewDialog.value = true
}

async function download(item?: Asset) {
  if (!item) {
    return
  }
  location.href = await sign(`assets/${item._id}/download`)
}

const shareAssetDialog = ref(false)
function shareAsset(item?: Asset) {
  if (!item) {
    return
  }

  selectedItem.value = item
  shareAssetDialog.value = true
}

const embedDialog = ref(false)
async function embed(item?: Asset) {
  if (!item) {
    return
  }

  selectedItem.value = item

  if (!item.public) {
    if (await confirm('Embed asset', 'Asset is private. Do you want to set it to public?')) {
      await api(`assets/${item._id}`, {
        method: 'PUT',
        body: {
          public: true,
        },
      })
      await refreshNuxtData()
      selectedItem.value['public'] = true
    }
    else {
      return
    }
  }

  embedDialog.value = true
}

const { copy } = useClipboard()

async function copyStreamUrl(item: Asset) {
  const { stream } = await api<{
    stream: string
  }>(`assets/${item._id}/stream`)
  return copy(stream)
}

async function remove(items: Asset[]) {
  if (!(await confirm('Remove', `Are you sure you want to remove ${items.length > 1
    ? 'these assets'
    : `"${items[0]?.title}"`
  }?`))) {
    return
  }

  for (const { _id } of items) {
    await api(`assets/${_id}`, {
      method: 'DELETE',
    })
  }

  await refresh()
}

const exporting = ref(false)
async function exportItems() {
  if (!itemsRef.value) {
    return
  }

  exporting.value = true
  try {
    await itemsRef.value.exportItems('assets',
      ({
        _id,
        createdAt,
        title,
        labels,
        ffprobe,
        subtitles = {},
      }) => ({
        id: _id,
        createdAt: new Date(createdAt),
        title,
        labels: labels.join(', '),
        duration: ffprobe?.format?.duration,
        subtitles: Object.entries(subtitles)
          .filter(([, enabled]) => enabled)
          .map(([language]) => language)
          .join(', '),
      }),
    )
  }
  finally {
    exporting.value = false
  }
}

watch(selected, (value) => {
  if (value.length === 0) {
    navigateTo({
      name: 'assets',
    }, {
      replace: true,
    })
  }
  else {
    navigateTo({
      name: 'assets-id',
      params: {
        id: value[0]!._id,
      },
    }, {
      replace: true,
    })
  }
})

function onSaved() {
  return refresh()
}

function progress(item: Asset) {
  const complete = ['processed', 'verified'].includes(item.state)
  return {
    modelValue: complete ? 100 : (item.job?.progress / item.ffprobe.format.duration * 100),
    color: item.state === 'verified' ? 'success' : 'info',
  }
}

function eta(item: Asset): string {
  if (['verified', 'completed'].includes(item.state)) {
    return ''
  }

  const { startedAt, progress } = item.job ?? {}
  const duration = item.ffprobe?.format?.duration ?? 0
  const eta = dayjs().add((dayjs().diff(startedAt, 'seconds') / progress) * (duration - progress), 'seconds')

  return eta.isValid() ? eta.format('HH:mm') : ''
}

function showInfo(item: Asset) {
  infoDialog.value = true
  selectedItem.value = item
}

async function saveWebVtt({ webVtt, assetId, language }: {
  webVtt: string
  assetId: string
  language: string
}) {
  await api(`assets/${assetId}/subtitles/${language}/${language}.vtt`, {
    method: 'PUT',
    body: webVtt,
  })
  editSubtitleDialog.value = false
}

async function refresh() {
  await itemsRef.value?.refresh?.()
}
</script>

<template>
  <div>
    <v-main>
      <c-item-list
        ref="items"
        v-model="selected"
        url="assets"
        :headers="headers"
        :filter="filter"
        default-sort="-createdAt"
      >
        <template #filters>
          <v-combobox
            v-model="labels"
            :items="availableLabels"
            label="Labels"
            multiple
            chips
            closable-chips
          />
        </template>
        <template #toolbar>
          <v-btn
            :disabled="selected.length !== 1 || selected[0]?.state !== 'verified'"
            @click="preview(selected[0])"
          >
            Preview
          </v-btn>
          <v-btn
            :disabled="selected.length !== 1 || selected[0]?.state !== 'verified'"
            @click="download(selected[0])"
          >
            Download
          </v-btn>
          <v-btn
            :disabled="selected.length !== 1 || selected[0]?.state !== 'verified'"
            @click="shareAsset(selected[0])"
          >
            Share
          </v-btn>
          <v-btn
            :disabled="selected.length !== 1 || selected[0]?.state !== 'verified'"
            @click="embed(selected[0])"
          >
            Embed
          </v-btn>
          <v-btn
            :disabled="selected.length === 0"
            @click="remove(selected)"
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
        </template>
        <template #contextMenu="{ item }">
          <v-list>
            <v-list-item
              v-if="Object.keys(item.subtitles ?? {}).length > 0"
              title="Edit subtitle"
              @click="editSubtitle(item)"
            />
            <v-list-item
              title="Show info"
              @click="showInfo(item)"
            />
            <v-list-item
              title="Copy stream url"
              @click="copyStreamUrl(item)"
            />
            <v-list-item
              title="Copy id"
              @click="copy(item._id)"
            />
            <v-list-item
              title="Remove"
              @click="remove([item])"
            />
          </v-list>
        </template>
        <template #[`item.public`]="{ value }">
          {{ value ? 'yes' : 'no' }}
        </template>
        <template #[`item.labels`]="{ value, item }">
          <v-chip
            v-for="label of value"
            :key="`${item._id}-${label}`"
          >
            {{ label }}
          </v-chip>
        </template>
        <template #[`item.subtitles`]="{ value }">
          {{ Object.keys(value ?? {}).length > 0 ? 'yes' : 'no' }}
        </template>
        <template #[`item.createdAt`]="{ value }">
          {{ dayjs(value).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template #[`item.progress`]="{ item }">
          <v-progress-linear
            v-bind="progress(item)"
          />
        </template>
        <template #[`item.eta`]="{ item }">
          <div
            v-if="!['completed', 'verified'].includes(item.state)"
            class="text-no-wrap"
          >
            <v-icon
              small
              icon="mdi-clock-outline"
            />
            {{ eta(item) }}
          </div>
        </template>
      </c-item-list>
    </v-main>
    <v-navigation-drawer
      location="end"
      permanent
      absolute
      persistent
      width="480"
    >
      <nuxt-page @saved="onSaved" />
    </v-navigation-drawer>
    <v-dialog
      v-model="infoDialog"
      width="720px"
    >
      <v-card>
        <v-card-text>
          <c-tree-view
            v-if="selectedItem"
            :value="selectedItem"
            class="py-3"
            :options="{ maxDepth: 1 }"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
    <dialog-subtitle-edit
      v-model="editSubtitleDialog"
      :asset="selectedItem"
      @webvtt="saveWebVtt"
    />
    <dialog-player
      v-if="selectedItem"
      v-model="previewDialog"
      :asset-id="selectedItem._id"
    />
    <dialog-share-asset
      v-if="selectedItem"
      v-model="shareAssetDialog"
      :item="selectedItem"
    />
    <dialog-embed-asset
      v-if="selectedItem"
      v-model="embedDialog"
      :item="selectedItem"
    />
  </div>
</template>
