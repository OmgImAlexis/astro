FROM node:alpine

WORKDIR /src
ADD . .
COPY ./config.json /etc/config.json

RUN yarn install --production && \
    ln -fs /etc/config.json /src/config.json

EXPOSE 3000

VOLUME "/src"

CMD node index.js
