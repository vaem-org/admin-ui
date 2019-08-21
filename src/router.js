import Vue from 'vue'
import Router from 'vue-router'
import Login from './views/Login'
import Assets from './views/Assets'

Vue.use(Router);

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'login',
      component: Login
    },
    {
      path: '/assets',
      name: 'assets',
      component: Assets
    }
  ]
});

router.beforeEach((to, from, next) => {
  if (to.name !== 'login' && !localStorage.getItem('token')) {
    next({name: 'login'})
  } else {
    next();
  }
});

export default router;