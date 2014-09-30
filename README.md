# Project 360 #

A brief todo list for project 360.

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
* app debug: sudo docker run --rm -i -t -P --volumes-from data --link db:db -p 3001:3001 -p 4001:4001 p360/app bash

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
