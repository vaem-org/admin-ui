FROM node:10
COPY ./ /app
WORKDIR /app
RUN yarn && yarn build

FROM nginx:stable-alpine
RUN mkdir /app
COPY --from=0 /app/dist /app
COPY nginx.conf /etc/nginx/nginx.conf