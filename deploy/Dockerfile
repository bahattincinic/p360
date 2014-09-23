# base ubuntu image
FROM ubuntu:14.04

# ADD /remento /opt/project

RUN apt-get update && \
    apt-get install -qy vim net-tools && \
    apt-get install -qy python-software-properties software-properties-common libpython2.7 && \
    apt-get install -qy nginx supervisor libpython2.7 && \
	apt-add-repository ppa:chris-lea/node.js && \
	apt-get update && \
	apt-get install -qy nodejs   && \
    apt-get remove -yq --purge python-dev software-properties-common python-software-properties && \
    apt-get autoremove -qy && \
    apt-get clean

#ADD /supervisord.conf /etc/supervisor/supervisord.conf
#ADD /nginx.conf /etc/nginx/nginx.conf
#ADD /django.wsgi /opt/run/django.wsgi
#ADD /uwsgi_app.ini /opt/vassals/uwsgi_app.ini

CMD ["/usr/bin/supervisord"]
