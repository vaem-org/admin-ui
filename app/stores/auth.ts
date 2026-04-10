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

import { useRuntimeConfig } from '#app'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>()
  const api = useAPI()
  const config = useRuntimeConfig()

  async function initialise() {
    token.value = sessionStorage.getItem('token') || undefined
  }

  function setToken(accessToken: string) {
    token.value = accessToken
    sessionStorage.setItem('token', accessToken)
  }

  async function login() {
    sessionStorage.setItem('redirectTo', useRoute().fullPath)
    const url = await api<string>('auth/google', {
      query: {
        redirect_uri: getRedirectUri(),
      },
    })
    await navigateTo(url, {
      external: true,
    })
  }

  function logout() {
    token.value = undefined
    sessionStorage.removeItem('token')
  }

  function getRedirectUri(): string {
    return new URL('/login', window.origin + config.app.baseURL).toString()
  }

  return {
    token,

    login,
    setToken,
    logout,

    initialise,
    getRedirectUri,
  }
})
