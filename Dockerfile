FROM node:alpine
MAINTAINER Alexis Tyler <xo@wvvw.me>

# Install Guessit - Instruction "borrowed" from the AUR (https://aur.archlinux.org/cgit/aur.git/tree/PKGBUILD?h=python-guessit)
ARG GUESSIT_VERSION=2.1.2
ARG GUESSIT=https://github.com/guessit-io/guessit/archive/$GUESSIT_VERSION.tar.gz

WORKDIR /tmp
RUN apk add --no-cache \
  python3\
  py-setuptools\
  py-dateutil\
  curl && \
  curl -O -L $GUESSIT && \
  tar zxf 2.1.2.tar.gz -C /tmp && \
  cd /tmp/guessit-$GUESSIT_VERSION && \
  python3 setup.py install --optimize=1 && \
  rm -rf /tmp/*guessit* /tmp/*.tar.gz

RUN mkdir /app

WORKDIR /app

COPY ./package.json .
COPY ./yarn.lock .

RUN yarn install

ENV MONGO_HOST mongo

COPY . .

EXPOSE 3000

CMD ["yarn", "start"]
