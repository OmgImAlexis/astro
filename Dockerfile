FROM node:alpine
MAINTAINER Alexis Tyler <xo@wvvw.me>

RUN mkdir /app

WORKDIR /app

COPY ./package.json .
COPY ./yarn.lock .

RUN yarn install

ENV MONGO_HOST mongo

COPY . .

EXPOSE 3000

CMD ["yarn", "start"]
