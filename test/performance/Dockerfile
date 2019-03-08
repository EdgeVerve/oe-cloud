FROM $REGISTRY/alpine-node:8.11.4

RUN mkdir -p /home/src

EXPOSE 3000

ENV NODE_ENV docker

ENV MONGO_HOST mongo

WORKDIR /home/src

COPY . /home/src

CMD node test/server.js
