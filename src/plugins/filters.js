import Vue from 'vue';
import format from 'date-fns/format';
import bytes from 'bytes';

Vue.filter('date', value => format(new Date(value), 'dd MMM yyyy, kk:mm:ss'));
Vue.filter('bytes', bytes);
Vue.filter('duration', value => {
  return [
    Math.floor(value / 3600),
    Math.floor(value / 60) % 60,
    Math.floor(value)  % 60
  ].map(value => value < 10 ? `0${value}` : value).join(':');
});