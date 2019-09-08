FROM node:10
WORKDIR /app
COPY package.json /app
COPY yarn.lock /app
RUN yarn
COPY ./ /app
RUN yarn build

FROM nginx:stable-alpine
RUN mkdir /app
COPY --from=0 /app/dist /app
COPY docker/nginx.conf /etc/nginx/nginx.conf

COPY docker/entrypoint.sh /entrypoint.sh

ENV WEBPACK_BASE_URL "."

CMD ["/entrypoint.sh"]
