<!--
  - VAEM - Asset manager
  - Copyright (C) 2019  Wouter van de Molengraft
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
    <v-container fluid>
      <v-layout row wrap class="px-1">
        <v-flex class="xs12 md3 order-md-2">
          <v-text-field prepend-icon="mdi-magnify" label="Search" v-model="search" clearable/>
        </v-flex>
        <v-flex class="xs12 md9">
          <slot/>
        </v-flex>
      </v-layout>
    </v-container>
    <v-data-table
      :headers="modifiedHeaders"
      :items="items"
      :server-items-length="totalItems"
      :options.sync="options"
      show-select
      must-sort
      v-model="selected"
      item-key="_id"
      @click:row="clickRow"
      :loading="loading"
    >
      <template v-for="(_, name) in $scopedSlots" :slot="name" slot-scope="slotData">
        <slot :name="name" v-bind="slotData" v-if="name!=='default'"/>
      </template>
      <template v-slot:item.contextMenu="{ item }">
        <v-menu bottom right @input="onContextMenu($event, item)">
          <template v-slot:activator="{ on }">
            <v-btn text icon v-on="on">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <slot name="contextMenu" v-bind="{ item }"/>
        </v-menu>
      </template>
    </v-data-table>
  </div>
</template>

<script>
  import pick from 'lodash/pick';
  import debounce from 'lodash/debounce';
  import isEqual from 'lodash/isEqual';

  export default {
    name: 'ItemList',
    props: {
      headers: Array,
      url: String,
      value: Array,
      loading: Boolean
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
    watch: {
      url() {
        this.update().catch(e => console.error(e));
      },
      options: {
        handler() {
          this.update({force: false}).catch(e => console.error(e));
        },
        deep: true
      },
      search() {
        this.options.page = 1;
        this.update({force: false}).catch(e => console.error(e));
      },
      value(newValue) {
        this.selected = newValue;
      },
      selected(value) {
        this.$emit('input', value);
      }
    },
    computed: {
      modifiedHeaders() {
        return ! this.$scopedSlots.contextMenu ? this.headers : [
          { text: '', value: 'contextMenu', sortable: false },
          ...this.headers
        ];
      }
    },
    mounted() {
      this.update().catch(e => console.error(e));
      this.selected = this.value || [];
    },
    methods: {
      update: debounce(async function({item, force=true}={force:true}) {
        if (item) {
          const index = this.items.findIndex(_item => item._id === _item._id);
          if (index !== -1) {
            this.$set(this.items, index, {
              ...this.items[index],
              ...item
            });
          }
          return;
        }

        const params = {
          ...pick(this.options, ['sortBy', 'sortDesc', 'page', 'itemsPerPage']),
          q: this.search
        };

        if (!isEqual(this.previousParams, params) || force) {
          const { data } = await this.$axios.get(this.url, {
            params
          });
          const selectedIds = this.selected.map(item => item._id);
          this.items = data.items;
          this.totalItems = data.totalItems;

          this.selected = this.items.filter(item => selectedIds.includes(item._id));

          this.previousParams = params;
        }
      }, 250, {
        leading: true
      }),

      clickRow(item) {
        if (!this.selected.includes(item)) {
          this.selected = [item];
        }
      },

      onContextMenu($event, item) {
        if (!this.selected.includes(item)) {
          this.selected = [item];
        }
        this.$emit('menu', $event)
      }
    }
  }
</script>

<style scoped>

</style>
