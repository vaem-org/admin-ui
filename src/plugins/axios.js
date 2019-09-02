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

"use strict";

import Vue from 'vue';
import axios from "axios";
import config from '@/config';

// Full config:  https://github.com/axios/axios#request-config
// axios.defaults.baseURL = process.env.baseURL || process.env.apiUrl || '';
// axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;
// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

let axiosConfig = {
  baseURL: config.apiUrl
  // timeout: 60 * 1000, // Timeout
  // withCredentials: true, // Check cross-site Access-Control
};

const _axios = axios.create(axiosConfig);

_axios.interceptors.request.use(
  function(config) {
    // Do something before request is sent
    config.headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
    return config;
  },
  function(error) {
    // Do something with request error
    return Promise.reject(error);
  }
);

// Add a response interceptor
_axios.interceptors.response.use(
  function(response) {
    // Do something with response data
    return response;
  },
  async function(error) {
    // Do something with response error
    if (!error.response || error.response.status !== 401 || error.response.data.message !== 'TokenExpiredError') {
      throw error;
    }

    const { data } = await _axios.post(`/login/${localStorage.getItem('loginProvider')}/refresh`, {
      token: localStorage.getItem('refreshToken')
    });

    localStorage.setItem('token', data.token);
    error.config.headers['Authorization'] = `Bearer ${data.token}`;
    return _axios.request(error.config);
  }
);

Plugin.install = function(Vue) {
  Vue.axios = _axios;
  window.axios = _axios;
  Object.defineProperties(Vue.prototype, {
    axios: {
      get() {
        return _axios;
      }
    },
    $axios: {
      get() {
        return _axios;
      }
    },
  });
};

Vue.use(Plugin)

export default Plugin;
