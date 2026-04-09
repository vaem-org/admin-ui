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

import type { $Fetch } from 'nitropack'

let api: $Fetch

export function useAPI() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const router = useRouter()

  if (!api) {
    api = $fetch.create({
      baseURL: config.public.apiUrl,
      onRequest({ options }) {
        if (authStore.token) {
          options.headers.set('Authorization', `Bearer ${authStore.token}`)
        }
      },
      async onResponse({ response: { _data, status } }) {
        if (status === 401
          && _data?.message === 'TokenExpiredError'
        ) {
          authStore.logout()
          sessionStorage.setItem('redirecTo', router.currentRoute.value.fullPath)
          await router.push('/')
        }
      },
    })
  }

  return api
}
