# Project 360 #

Random matching chat example for meteor

### What needs to be done still? ###

* Testing!! We do not know how reliable our code and setup is, so we need a lot of testing at this point
* Docket containers for deploying, one for mongodb db container, one for app server container and last one as data-only container, 3 containers in total.
* Learn more about data-only container [Docker Pieces Loosly Joined](http://www.offermann.us/2013/12/tiny-docker-pieces-loosely-joined.html)
* We need a reliable and automated way to handle deploying updated containers to server, or updating/downloading our code in containers.
* How to seperate concerns when using docker [Stackoverflow](http://stackoverflow.com/questions/18496940/how-to-deal-with-persistent-storage-e-g-databases-in-docker)
* [Learn Docker](https://www.docker.com/)
* Using  [DockerLinks](https://docs.docker.com/userguide/dockerlinks/) we can link multiple docker containers together, no fuss no harm.
* Using sentry for error tracking for meteor js with the help of meteor-raven
* Robomongo
* kadira

### MongoUsers ###

* use admin
* db.createUser({user: "admin", pwd: "xxx", roles: ["userAdminAnyDatabase"]})
* use meteor
* db.createUser({user: "meteor", pwd: "xxx", roles: ["readWrite", "dbAdmin"]})

### Running dockers ###

* sudo docker run --name data p360/data true
* db run:   sudo docker run -d --name db --volumes-from data p360/db
* db debug: sudo docker run -i -t --rm --volumes-from data p360/db bash
* app run: sudo docker run -d -P --name app --volumes-from data --link db:db -p 3000:3000 -p 4000:4000 p360/app
* app debug: sudo docker run --rm -i -t -P --volumes-from data --link db:db -p 3000:3000 -p 4000:4000 p360/app bash

### How do I get set up? ###

* Summary of set up
* Configuration
* Dependencies
* Database configuration
* How to run tests
* Deployment instructions

### Contribution guidelines ###

* Writing tests
* Code review
* Other guidelines

### Who do I talk to? ###

* Repo owner or admin
* Other community or team contact


### Example Env ###

{ HOSTNAME: '53da9d8cc37d',
  DB_NAME: '/elegant_fermat/db',
  DB_PORT_27017_TCP: 'tcp://172.17.0.8:27017',
  TERM: 'xterm',
  DB_PORT: 'tcp://172.17.0.8:27017',
  DB_PORT_27017_TCP_PORT: '27017',
  PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
  PWD: '/',
  DB_PORT_27017_TCP_PROTO: 'tcp',
  MONGO_URL: 'mongodb://meteor:1q2w3e@db:27017/meteor',
  ROOT_URL: 'http://example.com',
  SHLVL: '1'
}

