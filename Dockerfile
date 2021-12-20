FROM node:16.13.0-alpine

WORKDIR /app/

ADD ./package.json ./yarn.lock /app/

RUN yarn install

ADD . /app/

ARG API_URL
ARG EMBED_URL
ARG GOOGLE_CLIENT_ID

RUN yarn generate

ENV HOST=0.0.0.0

CMD ["yarn", "start"]
