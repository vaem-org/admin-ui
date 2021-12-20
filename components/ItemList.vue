<!--
  - VAEM - Asset manager
  - Copyright (C) 2021  Wouter van de Molengraft
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
  <div class="elevation-1">
    <v-row row wrap align="center" class="mb-3">
      <v-col cols="12" md="3" class="order-md-2">
        <v-text-field
          v-model="search"
          prepend-icon="mdi-magnify"
          label="Search"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" md="9">
        <div class="d-flex flg">
          <slot />
        </div>
      </v-col>
    </v-row>
    <v-data-table
      v-model="selected"
      :headers="modifiedHeaders"
      :items="items"
      :server-items-length="totalItems"
      :options.sync="options"
      show-select
      must-sort
      item-key="_id"
      :loading="loading"
      mobile-breakpoint="0"
      @click:row="clickRow"
    >
      <template v-for="(_, name) in $scopedSlots" :slot="name" slot-scope="slotData">
        <slot v-if="name!=='default'" :name="name" v-bind="slotData" />
      </template>
      <template #[`item.contextMenu`]="{ item }">
        <v-menu bottom right @input="onContextMenu($event, item)">
          <template #activator="{ on }">
            <v-btn text icon v-on="on">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <slot name="contextMenu" v-bind="{ item }" />
        </v-menu>
      </template>
    </v-data-table>
  </div>
</template>

<script>
/* eslint-disable no-console */
export default {
  name: 'ItemList',
  props: {
    headers: {
      type: Array,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    value: {
      type: Array,
      required: true
    },
    loading: Boolean,
    populate: {
      type: Array,
      default: () => []
    }
  },
  data: () => ({
    search: '',
    items: [],
    totalItems: 0,
    options: {
      sortBy: ['createdAt'],
      sortDesc: [true]
    },
    selected: []
  }),
  computed: {
    modifiedHeaders () {
      return !this.$scopedSlots.contextMenu
        ? this.headers
        : [
            { text: '', value: 'contextMenu', sortable: false },
            ...this.headers
          ]
    }
  },
  watch: {
    url () {
      this.update().catch(e => console.error(e))
    },
    options: {
      handler () {
        this.update({ force: false }).catch(e => console.error(e))
      },
      deep: true
    },
    search () {
      this.options.page = 1
      this.update({ force: false }).catch(e => console.error(e))
    },
    value (newValue) {
      this.selected = newValue
    },
    selected (value) {
      this.$emit('input', value)
    }
  },
  mounted () {
    this.update().catch(e => console.error(e))
    this.selected = this.value || []
  },
  methods: {
    async update ({ item, force = true } = { force: true }) {
      if (item) {
        const index = this.items.findIndex(_item => item._id === _item._id)
        if (index !== -1) {
          this.$set(this.items, index, {
            ...this.items[index],
            ...item
          })
        }
        return
      }

      const params = {
        ...this.options,
        q: this.search,
        populate: this.populate.length > 0 ? this.populate.join(',') : undefined
      }

      const stringifiedParams = JSON.stringify(params)
      if (stringifiedParams !== this.previousParams || force) {
        const { data: items, headers } = await this.$axios.get(this.url, {
          params: {
            ...params,
            filter: JSON.stringify({
              deleted: {
                $ne: true
              }
            })
          }
        })
        const selectedIds = this.selected.map(item => item._id)
        this.items = items
        this.totalItems = parseInt(headers['x-total'])

        this.selected = this.items.filter(item => selectedIds.includes(item._id))

        this.previousParams = stringifiedParams
      }
    },

    clickRow (item) {
      if (!this.selected.includes(item)) {
        this.selected = [item]
      }
    },

    onContextMenu ($event, item) {
      if (!this.selected.includes(item)) {
        this.selected = [item]
      }
      this.$emit('menu', $event)
    }
  }
}
</script>
