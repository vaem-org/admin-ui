/*
 * VAEM - Asset manager
 * Copyright (C) 2026  Wouter van de Molengraft
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

type Type = 'info' | 'success' | 'warning' | 'error'
interface State {
  type: Type
  message: string
  visible: boolean
  timeout: number
}

const setter = (type: Type) => function (this: State, message: string, timeout: number = 10000) {
  this.type = type
  this.message = message
  this.visible = true
  this.timeout = timeout
}

export const useSnackbarStore = defineStore('snackbar', {
  state: (): State => ({
    visible: false,
    message: '',
    type: 'info',
    timeout: 10000,
  }),
  actions: {
    setSuccess: setter('success'),
    setInfo: setter('info'),
    setWarning: setter('warning'),
    setError: setter('error'),
  },
})
