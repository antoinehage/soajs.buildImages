module.exports = {
    serviceName: "buildImages",
    servicePort: 4100,
    extKeyRequired: false,

    "FILES": __dirname + "/FILES/",
    "deployer": __dirname + "/deployer/",
    "workingDir": "/opt/tmp/",
    "localSrcDir": "/opt/soajs/node_modules/",

    "imagePrefix": {
        "core": "soajsorg/"
    },

    "dockerTemnplates": {
        "nginx": {
            "from": 'FROM soajsorg/basenginx',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                'RUN apt-get update && apt-get install --fix-missing -y make g++ libssl-dev libcurl3', //NOTE: set here temporary for testing, should be moved to base image
                'RUN mkdir -p /opt/soajs/FILES/profiles && mkdir -p /opt/soajs/deployer && mkdir -p /etc/nginx/ssl',
                'ADD ./deployer /opt/soajs/deployer/', // new deployer
                'RUN cd /opt/soajs/deployer/ && npm install',
                'ENV NODE_ENV=production',
                'EXPOSE #SERVICEPORT#',
                'CMD ["/bin/bash"]']
        },
        "soajs": {
            "from": 'FROM soajsorg/baseservice',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                'RUN apt-get update && apt-get install --fix-missing -y libssl-dev libcurl3', //NOTE: set here temporary for testing, should be moved to base image
                'RUN mkdir -p /opt/soajs/node_modules && mkdir -p /opt/soajs/FILES/profiles && mkdir -p /opt/soajs/deployer',
                'ADD ./FILES /opt/soajs/FILES/', // old deployer, will be removed
                'ADD ./deployer /opt/soajs/deployer/', // new deployer
                'RUN cd /opt/soajs/deployer/ && npm install',
                'ENV NODE_ENV=production',
                'RUN cd /opt/soajs/FILES/soajs && npm install',
                'CMD ["/bin/bash"]']
        },
        "logstash": {
            "from": 'FROM logstash:2.4.0',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                'Add ./FILES/conf/logstash.conf /conf/logstash.conf',
                'RUN chown logstash:logstash /conf/logstash.conf',
                'CMD ["/bin/bash"]']
        },
        "filebeat": {
            "from": "FROM ubuntu:16.04",
            "maintainer": "MAINTAINER SOAJS Team <team@soajs.org>",
            "body": [
                'RUN apt-get update && apt-get install -y curl',
                'RUN cd /opt/ && \\',
                    'curl -o filebeat.deb https://download.elastic.co/beats/filebeat/filebeat_1.3.1_amd64.deb && \\',
                    'dpkg -i filebeat.deb && \\',
                    'rm filebeat.deb',
                'ADD ./FILES/conf/filebeat.yml /etc/filebeat/filebeat.yml',
                'CMD ["/bin/bash"]'
            ]
        }
    },

    "errors": {
        "402": "No Uploaded files where detected.",
        "403": "Invalid file uploaded! make sure you zip your service before you upload it."
    },
    "schema": {
    }
};
