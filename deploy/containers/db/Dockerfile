FROM stackbrew/ubuntu:precise
# Installation:
# Import MongoDB public GPG key AND create a MongoDB list file
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
RUN echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | tee /etc/apt/sources.list.d/10gen.list

RUN apt-get update && apt-get install -y mongodb-org
# replace this with a volume
RUN mkdir -p /data/mongo/db && mkdir -p /data/mongo/log/

ADD mongod.conf /etc/mongod.conf

CMD /usr/bin/mongod --config /etc/mongod.conf