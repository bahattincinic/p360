# app container for p360
# to be stored as p360/app
FROM stackbrew/ubuntu:precise

RUN echo "deb http://archive.ubuntu.com/ubuntu precise main universe" > /etc/apt/sources.list
RUN echo "deb http://ppa.launchpad.net/chris-lea/node.js/ubuntu precise main" >> /etc/apt/sources.list
RUN apt-get update

# Faster to add GPG key directly, rather than install python-software-properties
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys C7917B12

RUN apt-get update
RUN apt-get install -y nodejs
RUN npm install -g forever

ADD bundle /app
# install depended npm modules for meteor project
WORKDIR /app/programs/server/
RUN npm install && npm install socket.io
# these env vars needed for app to run
ENV PORT 3001
ENV MONGO_URL mongodb://meteor:1q2w3e@db:27017/meteor
ENV ROOT_URL http://example.com
# expose needed ports
EXPOSE 3001
EXPOSE 4000
# reset workdir to /
WORKDIR /

CMD forever /app/main.js
