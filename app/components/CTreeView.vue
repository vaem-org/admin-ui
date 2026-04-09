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
// TODO: check build failure for following line and remove style tag
// import 'json-tree-view-vue3/dist/style.css'

const { current } = useTheme()

const JsonTreeView = defineAsyncComponent(async () => (await import('json-tree-view-vue3')).JsonTreeView)

const props = defineProps<{
  value: Record<string, unknown>
  options?: Record<string, unknown>
}>()

const data = computed(() => {
  const { _id, __v, ...item } = props.value ?? {}
  return {
    id: _id,
    ...item,
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

<style scoped>
.json-view-item:where(:not(.root-item)) {
  margin-inline-start: 15px
}

.value-key {
  color: var(--jtv-valueKey-color);
  font-weight: 600;
  white-space: nowrap;
  display: inline-block;
  padding-block: 5px;
  padding-inline: 10px 5px;
  margin-inline-start: 10px;
  border-radius: 2px
}

.value-key.can-select {
  cursor: pointer;
  transition: background-color .2s ease
}

.value-key.can-select:is(:hover,:focus-visible) {
  background-color: #00000014
}

.value-key.can-select:focus-visible {
  outline: 2px solid var(--jtv-hover-color);
  outline-offset: 2px
}

.data-key {
  all: unset;
  box-sizing: border-box;
  color: var(--jtv-key-color);
  font-weight: 600;
  white-space: nowrap;
  display: flex;
  align-items: center;
  inline-size: 100%;
  padding-block: 5px;
  padding-inline: 5px;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color .2s ease
}

.data-key:is(:hover,:focus-visible) {
  background-color: var(--jtv-hover-color)
}

.data-key:focus-visible {
  outline: 2px solid var(--jtv-hover-color);
  outline-offset: 2px
}

.data-key .properties {
  font-weight: 300;
  opacity: .9;
  margin-inline-start: calc(var(--jtv-spacing-unit, 4px) * 1);
  -webkit-user-select: none;
  user-select: none
}

.chevron-arrow {
  flex-shrink: 0;
  inline-size: var(--jtv-arrow-size);
  block-size: var(--jtv-arrow-size);
  margin-inline: 5px 20px;
  border-inline-end: 2px solid var(--jtv-arrow-color);
  border-block-end: 2px solid var(--jtv-arrow-color);
  transform: rotate(-45deg);
  transition: transform .2s ease
}

.chevron-arrow.opened {
  margin-block-start: -3px;
  transform: rotate(45deg)
}

.expand-enter-active, .expand-leave-active {
  transition: opacity .2s ease, max-block-size .2s ease;
  overflow: hidden
}

.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-block-size: 0
}

.expand-enter-to, .expand-leave-from {
  opacity: 1;
  max-block-size: 1000px
}

@media (prefers-reduced-motion: reduce) {
  .value-key.can-select, .data-key, .chevron-arrow, .expand-enter-active, .expand-leave-active {
    transition: none
  }
}

.root-item[data-v-9f840ee1] {
  --jtv-key-color: oklch(.55 .15 240);
  --jtv-valueKey-color: oklch(.25 .05 210);
  --jtv-string-color: oklch(.6 .12 230);
  --jtv-number-color: oklch(.65 .1 180);
  --jtv-boolean-color: oklch(.55 .15 40);
  --jtv-null-color: oklch(.55 .12 280);
  --jtv-arrow-color: oklch(.3 0 0);
  --jtv-hover-color: oklch(0 0 0 / .1);
  --jtv-arrow-size: 6px;
  --jtv-spacing-unit: 4px;
  display: block;
  inline-size: 100%;
  block-size: auto;
  margin-inline-start: 0
}

.root-item.dark[data-v-9f840ee1] {
  --jtv-key-color: oklch(.75 .1 220);
  --jtv-valueKey-color: oklch(.95 .02 90);
  --jtv-hover-color: oklch(1 0 0 / .1);
  --jtv-arrow-color: oklch(.95 .02 90)
}
</style>
