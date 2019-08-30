<template>
  <v-container @drop.stop.prevent="uploadFiles" @dragover.prevent="dragover">
    <item-list :headers="headers" url="/uploads" v-model="items" ref="items">
      <v-btn text tile color="primary" class="upload">
        <input type="file" multiple @change="uploadFiles">
        Upload
      </v-btn>
      <v-btn text tile color="primary" :disabled="items.length===0 || items.filter(item => item.type === 'video').length !== items.length" @click="addToQueue(items)">Add to queue</v-btn>
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].type!=='video'" @click="openDialog(items[0], 'streams')">Select audio streams</v-btn>
      <v-btn text tile color="primary" :disabled="items.length!==1 || items[0].type!=='subtitle'" @click="openDialog(items[0], 'assignToAsset')">Assign to asset</v-btn>
      <template v-slot:contextMenu="{ item }">
        <v-list>
          <v-list-item v-if="item.type==='video'" @click="addToQueue([item])">
            <v-list-item-title>Add to queue</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="item.type==='video'" @click="openDialog(item, 'addToQueue')">
            <v-list-item-title>Add to queue (advanced)</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="item.type==='video'" @click="openDialog(item, 'streams')">
            <v-list-item-title>Select audio streams</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="item.type==='subtitle'" @click="openDialog(item, 'assignToAsset')">
            <v-list-item-title>Assign to asset</v-list-item-title>
          </v-list-item>
          <v-list-item @click="remove([item])">
            <v-list-item-title>Remove</v-list-item-title>
          </v-list-item>
        </v-list>
      </template>
      <template v-slot:item.size="{ item }">
        {{ item.size | bytes }}
      </template>
      <template v-slot:item.createdAt="{ item }">
        {{ item.createdAt | date }}
      </template>
      <template v-slot:item.state="{ item }">
        <v-progress-circular v-if="item.state==='uploading'" indeterminate size="30"/>
        {{ item.state!=='uploading' ? item.state : '' }}
      </template>
      <template v-slot:item.progress="{ item }">
        <v-progress-linear :value="item.uploaded / item.size * 100"
                           :color="item.state==='complete' ? 'success' : 'primary'"/>
      </template>
    </item-list>
    <streams-dialog v-model="streamsDialog" :item="item"/>
    <assign-to-asset-dialog v-model="assignToAssetDialog" :item="item"/>
    <add-to-queue-dialog v-model="addToQueueDialog" :item="item"/>
  </v-container>
</template>

<script>
  import ItemList from '@/components/ItemList';
  import StreamsDialog from '@/components/uploads/StreamsDialog';
  import AssignToAssetDialog from '@/components/uploads/AssignToAssetDialog';
  import get from 'lodash/get';
  import keyBy from 'lodash/keyBy';
  import pick from 'lodash/pick';
  import clone from 'lodash/clone';
  import AddToQueueDialog from '@/components/uploads/AddToQueueDialog';
  import { socketio } from '@/util/socketio';

  export default {
    name: 'Uploads',
    components: { AddToQueueDialog, AssignToAssetDialog,  StreamsDialog, ItemList },
    data: () => ({
      headers: [
        { text: 'Name', value: 'name' },
        { text: 'Progress', value: 'progress' },
        { text: 'Created at', value: 'createdAt' },
        { text: 'Size', value: 'size' },
        { text: 'State', value: 'state' },
        { text: 'Type', value: 'type'}
      ],
      items: [],
      item: {},
      streamsDialog: false,

      assignToAssetDialog: false,

      addToQueueDialog: false
    }),
    methods: {
      dragover(event) {
        event.dataTransfer.dropEffect = 'copy';
      },

      async addToQueue(items) {
        for(let upload of items) {
          await this.$axios.post('/encoders/start-job', {
            fileId: upload._id
          });
        }
      },

      openDialog(item, prop) {
        this.item = clone(item);
        this[`${prop}Dialog`] = true;
      },

      async remove(items) {
        await this.$axios.post('/uploads/remove', items.map(item => item._id));
        this.$refs.items.update();
      },

      async uploadFiles(event) {
        const files = get(event, 'dataTransfer.files', get(event, 'target.files', []));

        const items = keyBy((await this.$axios.post('/uploads/prepare', Array.from(files).map(
          file => pick(file, ['size', 'name'])
        ))).data, 'name');

        for (let file of files) {
          const offset = items[file.name].uploaded || 0;
          await this.$axios.put(`/uploads/${file.name}`, offset !== 0 ? file.slice(offset) : file, {
            params: {
              size: file.size,
              offset
            }
          });
        }

        if (event.target) {
          event.target.value = '';
        }
      }
    },

    mounted() {
      this.io = socketio('/uploads');
      this.io.on('progress', data => {
        this.$refs.items.update({item: data});
      });
      this.io.on('created', () => {
        console.log('Item created');
        this.$refs.items.update();
      });
    },

    destroyed() {
      this.io.close();
      this.io = null;
    }
  }
</script>

<style scoped lang="scss">
  .upload {
    position: relative;
    overflow: hidden;

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

  .container {
    height: 100%;
  }
</style>