/*
 * VAEM - Asset manager
 * Copyright (C) 2019  Wouter van de Molengraft
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export default {
  props: {
    value: Boolean
  },

  data: () => ({
    dialog: false
  }),

  watch: {
    async value(val) {
      if (val && this.initDialog) {
        if ((await this.initDialog()) === false) {
          this.$emit('input', false);
          return;
        }
      }
      this.dialog = val;
    },

    dialog(val) {
      this.$emit('input', val);
    }
  },

  mounted() {
    this.$emit('input', this.dialog);
  }
}