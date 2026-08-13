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
import 'json-tree-view-vue3/style.css'
import { omit } from 'remeda'

const { current } = useTheme()

const JsonTreeView = defineAsyncComponent(async () => (await import('json-tree-view-vue3')).JsonTreeView)

const props = defineProps<{
  value: Record<string, unknown>
  options?: Record<string, unknown>
}>()

const data = computed(() => {
  return {
    ...omit(props.value, ['_id', '__v']),
    id: props.value._id,
  }
})
</script>

<template>
  <json-tree-view
    :json="JSON.stringify(data)"
    :max-depth="1"
    root-key="item"
    :color-scheme="current.dark ? 'dark' : 'light'"
  />
</template>
