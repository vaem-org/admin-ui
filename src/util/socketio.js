import config from '@/config';

import io from 'socket.io-client';

const url = new URL(config.apiUrl);

export function socketio(namespace) {
  return io(url.origin + namespace, {
    path: url.pathname + (url.pathname.endsWith('/') ? '' : '/')+ 'socket.io'
  });
}