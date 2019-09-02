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

import Vue from 'vue'
import Router from 'vue-router'
import Login from './views/Login'
import Assets from './views/assets/index'
import EditAsset from './views/assets/_id';
import Uploads from './views/Uploads';
import Encoders from './views/Encoders';
import Player from './views/Player';
import config from '@/config';

Vue.use(Router);

const router = new Router({
  mode: 'history',
  base: config.baseUrl,
  routes: [
    {
      path: '/',
      name: 'login',
      component: Login,
      meta: {
        emptyLayout: true
      }
    },
    {
      path: '/assets',
      name: 'assets',
      component: Assets,
      meta: {
        authenticated: true
      },
      children: [
        {
          path: ':id',
          name: 'asset',
          components: {
            right: EditAsset
          }
        },
      ]
    },
    {
      path: '/uploads',
      name: 'uploads',
      component: Uploads,
      meta: {
        authenticated: true
      }
    },
    {
      path: '/encoders',
      name: 'encoders',
      component: Encoders,
      meta: {
        authenticated: true
      }
    },
    {
      path: '/player/:assetId/:timestamp/:signature',
      name: 'player',
      component: Player,
      meta: {
        emptyLayout: true
      }
    }
  ]
});

router.beforeEach((to, from, next) => {
  if (to.meta.authenticated && !localStorage.getItem('token')) {
    next({name: 'login'})
  } else {
    next();
  }
});

export default router;