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
<script setup lang="ts" generic="T extends Item">
import type { DataTableHeader } from 'vuetify/framework'
import type { Item } from '~/types/Item.js'
import { useRouteQuery } from '@vueuse/router'
import dayjs from 'dayjs'

const props = withDefaults(defineProps<{
  headers: DataTableHeader[]
  url: string
  populate?: string[]
  filter?: Record<string, unknown>
  defaultSort?: string
}>(), {
  populate: () => [],
})

const model = defineModel<T[]>({
  required: true,
})

const slots = defineSlots<{
  contextMenu: []
  filters: []
  toolbar: []
}>()

const emit = defineEmits<{
  'click:row': [Event, { item: T }]
}>()

defineExpose({
  refresh: refreshItems,
  exportItems,
})

const api = useAPI()

const search = useRouteQuery<string>('q', '')

const sortBy = useRouteQuery<string>('sortBy', props.defaultSort)

const showFilters = ref(false)
const itemsPerPage = useRouteQuery('itemsPerPage', 10, {
  transform: Number,
})
const page = useRouteQuery('page', 1, {
  transform: Number,
})

watch(() => props.filter, (value) => {
  showFilters.value = value !== undefined
}, {
  immediate: true,
})

type SortColumn = { key: string, order: 'asc' | 'desc' }
const internalSortBy = computed<SortColumn[]>({
  set(value: SortColumn[]) {
    sortBy.value = (value[0]?.order === 'desc' ? '-' : '')
      + value[0]?.key
  },
  get(): SortColumn[] {
    if (!sortBy.value) {
      return []
    }

    return [
      {
        key: sortBy.value.startsWith('-')
          ? sortBy.value.substring(1)
          : sortBy.value,
        order: sortBy.value.startsWith('-')
          ? 'desc'
          : 'asc',
      },
    ]
  },
})

const modifiedHeaders = computed<DataTableHeader[]>(() => {
  return !slots.contextMenu
    ? props.headers
    : [
        { title: '', value: 'contextMenu', sortable: false },
        ...props.headers,
      ]
})

const queryParams = computed(() => {
  return {
    page: page.value - 1,
    per_page: itemsPerPage.value,
    sort: sortBy.value,
    q: search.value,
    populate: props.populate.length > 0 ? props.populate.join(',') : undefined,
    filter: JSON.stringify({
      ...props.filter,
      deleted: {
        $ne: true,
      },
    }),
  }
})

const { data, status, refresh } = await useAsyncData<{
  items: T[]
  total: number
}>(() => props.url, async () => {
  const response = await api.raw<T[]>(props.url, {
    query: queryParams.value,
  })

  return {
    items: response._data ?? [],
    total: parseInt(response.headers.get('x-total') ?? '0'),
  }
}, {
  default: () => ({
    items: [],
    total: 0,
  }),
  lazy: true,
})

const selected = computed<string[]>({
  set(value: string[]) {
    const byId = Object.fromEntries(
      data.value.items
        .map((item: T) => [item._id, item]),
    )
    model.value = value.map(_id => byId[_id] as T)
  },
  get() {
    return model.value.map(({ _id }) => _id)
  },
})

watch([sortBy, page, itemsPerPage, () => props.filter], () => refresh())

watchDebounced(search, () => refresh(), {
  debounce: 300,
  deep: true,
})

function clickRow(event: Event, { item }: { item: T }) {
  if (!model.value.some(({ _id }) => _id === item.id)) {
    model.value = [item]
  }
  emit('click:row', event, { item })
}

function onContextMenu(item: T) {
  if (!model.value.some(({ _id }) => _id === item._id)) {
    model.value = [item]
  }
}

async function refreshItems() {
  await refresh()
  const currentItems: Record<string, T> = Object.fromEntries(
    data.value.items.map(item => [item._id, item]),
  )
  model.value = model.value
    .filter(({ _id }) => currentItems[_id])
    .map(({ _id }) => currentItems[_id] as T)
}

/**
   * Export items
   * @param filenamePrefix the prefix of the filename
   * @param [itemModifier] optionally convert items using this function
   */
async function exportItems(filenamePrefix: string,
  itemModifier: (item: T) => Record<string, unknown> = item => item,
) {
  let items: Record<string, unknown>[] = []
  let page = 0
  let total = 0
  do {
    const response = await api.raw<T[]>(props.url, {
      query: {
        ...queryParams.value,
        page,
        per_page: 500,
      },
    })
    if (total === 0) {
      total = parseInt(response.headers.get('x-total') ?? '0')
    }

    items = items.concat(response._data?.map?.(itemModifier) ?? [])
    page++
  } while (items.length < total)

  const {
    utils,
    writeFileXLSX,
  } = await import('xlsx')
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, utils.json_to_sheet(items), 'assets')

  writeFileXLSX(workbook, `${filenamePrefix}-${dayjs().format('YYYY-MM-DD')}.xlsx`, {
    cellDates: true,
  })
}
</script>

<template>
  <div class="elevation-1">
    <v-row
      row
      wrap
      align="center"
      class="mb-3"
    >
      <v-col
        cols="12"
        md="3"
        class="order-md-2"
      >
        <div class="d-flex align-center">
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search"
            clearable
            hide-details
            dense
            filled
            solo
          />
          <v-btn
            v-if="slots.filters"
            icon="mdi-filter-variant"
            class="ml-3"
            @click="showFilters = !showFilters"
          />
        </div>
      </v-col>
      <v-col
        cols="12"
        md="9"
      >
        <div class="d-flex flex-wrap ga-3 mt-3">
          <slot name="toolbar" />
        </div>
      </v-col>
    </v-row>
    <v-expand-transition>
      <div v-if="showFilters">
        <slot name="filters" />
      </div>
    </v-expand-transition>

    <v-data-table-server
      v-model="selected"
      v-model:page="page"
      v-model:items-per-page="itemsPerPage"
      v-model:sort-by="internalSortBy"
      :headers="modifiedHeaders"
      :items="data.items"
      :items-length="data.total"
      show-select
      must-sort
      item-value="_id"
      :loading="status === 'pending'"
      :mobile-breakpoint="0"
      @click:row="clickRow"
    >
      <template
        v-for="(_, name) in slots"
        #[name]="slotData"
      >
        <!-- @vue-expect-error type of name is any here -->
        <slot
          v-if="name !== 'default'"
          :name="name"
          v-bind="slotData ?? {}"
        />
      </template>
      <template #[`item.contextMenu`]="{ item }">
        <v-menu
          bottom
          right
          @update:model-value="onContextMenu(item)"
        >
          <template #activator="{ props: activatorProps }">
            <v-btn
              variant="text"
              icon="mdi-dots-vertical"
              v-bind="activatorProps"
            />
          </template>
          <slot
            name="contextMenu"
            v-bind="{ item }"
          />
        </v-menu>
      </template>
    </v-data-table-server>
  </div>
</template>
