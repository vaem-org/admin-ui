import Vue from 'vue'
import Router from 'vue-router'
import Login from './views/Login'
import Assets from './views/Assets'
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
      }
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