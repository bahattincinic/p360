#!/usr/bin/env python
import os
from datetime import datetime
from fabric.api import run, env, cd, task, prefix
from fabric.colors import (green, red, cyan, magenta, yellow)
from fabric.contrib.files import exists
from fabric.network import disconnect_all
from fabric.operations import put, sudo
from fabric.context_managers import settings, hide

env.use_ssh_config = True

class Deploy(object):
    tgz = '360.tgz'
    workspace = '~/workspace/360'
    appdir = '%s/deploy/containers/app' % workspace
    tags = {'app': 'app', 'db': 'db'}
    project = 'p360'

    def bundle(self):
        with cd(self.appdir):
            if exists('bundle'):
                print yellow('old bundle found, removing')
                run('rm -rf bundle')
            else:
                print green('extracted bundle not found')

        with cd(self.workspace):
            if exists(self.tgz):
                print yellow('remove old file %s' % self.tgz)
                run('pwd')
                run('rm -rf %s' % self.tgz)
            else:
                print green('no old file')

            print green('bundle up..')

            try:
                with settings(hide('warnings', 'running', 'stdout', 'stderr'), warn_only=True):
                    name = datetime.strftime(datetime.now(), '%Y_%m_%d__%H_%M')
                    command = 'docker run --rm  --name %(name)s -v ~/workspace/360:/opt/application  p360/meteor meteor bundle 360.tgz' % {'name': name}
                    print command
                    sudo(command)
            except:
                print red('make sure meteor docker image exists')
                raise

    def extract(self):
        # check extracted
        with cd(self.workspace):
            if not exists(self.tgz):
                raise Exception('cannot find bundle %s' % self.tgz)

            print green('extracting..')
            run('tar xfz %(bundle)s -C %(dockerApp)s' % {'bundle': self.tgz, 'dockerApp': self.appdir})
            print cyan('remove bundle file %s' % self.tgz)
            os.chmod(self.tgz, 0777)
            os.remove(self.tgz)

    def build(self):
        try:
            sudo('docker stop %s' % self.tags['app'])
            sudo('docker rm -v %s' % self.tags['app'])
        except:
            print yellow('container maybe non-existing..')

        with cd(self.appdir):
            sudo('docker build -t %(pname)s/%(tag)s .' % {'pname': self.project, 'tag': self.tags['app']})

    def clean(self):
        """
        clean dangling images
        """
        aa = sudo('docker images -f dangling=true -q')
        for image in aa.split('\r\n'):
            sudo('docker rmi %s' % image)


@task
def docker():
    try:
        deploy = Deploy()
        deploy.bundle()
        deploy.extract()
        deploy.build()
        deploy.clean()
    finally:
        disconnect_all()
