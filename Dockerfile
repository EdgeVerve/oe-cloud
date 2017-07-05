FROM registry.oecloud.ad.infosys.com/alpine-node:latest

RUN mkdir -p /home/src

ENV NODE_ENV docker
ENV MONGO_HOST mongo
ENV POSTGRES_HOST postgres

EXPOSE 3000

WORKDIR /home/src

COPY . /home/src

CMD node .