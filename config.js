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
                'RUN mkdir -p /opt/soajs/FILES/profiles && mkdir -p /opt/soajs/deployer && mkdir -p /etc/nginx/ssl',
                'ADD ./deployer /opt/soajs/deployer/',
                'ENV NODE_ENV=production',
                'RUN cd /opt/soajs/deployer/ && npm install',
                'EXPOSE #SERVICEPORT#',
                'CMD ["/bin/bash"]']
        },
        "soajs": {
            "from": 'FROM soajsorg/baseservice',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                'RUN mkdir -p /opt/soajs/node_modules && mkdir -p /opt/soajs/FILES/profiles && mkdir -p /opt/soajs/deployer',
                'ADD ./deployer /opt/soajs/deployer/',
                'ADD ./FILES /opt/soajs/FILES/',
                'ENV NODE_ENV=production',
                'RUN cd /opt/soajs/deployer/ && npm install',
                'RUN cd /opt/soajs/FILES/soajs && npm install',
                'CMD ["/bin/bash"]']
        },
        "logstash": {
		    "from": 'FROM docker.elastic.co/logstash/logstash:5.3.0',
		    "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
		    "body": [
                'USER root',
                'RUN apt-get update && \\',
                    'apt-get install --fix-missing -y git curl && \\',
                    'curl -sL https://deb.nodesource.com/setup_6.x | bash && \\',
                    'apt-get install --fix-missing -y nodejs',
                'RUN mkdir -p /opt/soajs/deployer',
                'ADD ./deployer /opt/soajs/deployer',
                'RUN cd /opt/soajs/deployer/ && npm install',
			    'CMD ["/bin/bash"]']
	    },
        "filebeat": {
            "from": "FROM ubuntu:16.04",
            "maintainer": "MAINTAINER SOAJS Team <team@soajs.org>",
            "body": [
                'RUN apt-get update && apt-get install -y curl',
                'RUN cd /opt/ && \\',
                    'curl -o filebeat.deb https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-5.3.0-amd64.deb && \\',
                    'dpkg -i filebeat.deb && \\',
                    'rm filebeat.deb',
                'ADD ./FILES/filebeat/filebeat.yml /etc/filebeat/filebeat.yml',
                'CMD ["/bin/bash"]'
            ]
        },
        "metricbeat": {
            "from": "FROM frolvlad/alpine-glibc",
            "maintainer": "MAINTAINER SOAJS Team <team@soajs.org>",
            "body": [
                'ENV METRICBEAT_VERSION=5.3.0',
                'RUN apk add --no-cache ca-certificates curl nodejs git && mkdir -p /opt/soajs/deployer/',
                'RUN curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-${METRICBEAT_VERSION}-linux-x86_64.tar.gz && \\',
                    'tar -xvvf metricbeat-${METRICBEAT_VERSION}-linux-x86_64.tar.gz && \\',
                    'mv metricbeat-${METRICBEAT_VERSION}-linux-x86_64/ /metricbeat && \\',
                    'mv /metricbeat/metricbeat.yml /metricbeat/metricbeat.example.yml && \\',
                    'mv /metricbeat/metricbeat /bin/metricbeat && \\',
                    'chmod +x /bin/metricbeat && \\',
                    'mkdir -p /metricbeat/config /metricbeat/data && \\',
                    'rm metricbeat-${METRICBEAT_VERSION}-linux-x86_64.tar.gz',
                'ADD ./deployer /opt/soajs/deployer/',
                'RUN cd /opt/soajs/deployer/ && npm install',
                'CMD ["/bin/sh"]'
            ]
        },
        "kibana": {
            "from": "FROM kibana:5.3.0",
            "maintainer": "MAINTAINER SOAJS Team <team@soajs.org>",
            "body": [
                'RUN apt-get update && \\',
                    'apt-get install --fix-missing -y git curl && \\',
                    'curl -sL https://deb.nodesource.com/setup_6.x | bash && \\',
                    'apt-get install --fix-missing -y nodejs && \\',
                    'npm install --global bower',
                'WORKDIR /usr/share/kibana/plugins',
                'RUN git clone https://github.com/nreese/kibana-time-plugin.git && \\',
                    'cd /usr/share/kibana/plugins/kibana-time-plugin && \\',
                    'bower install --allow-root',
                'ADD ./FILES/kibana/package.json /usr/share/kibana/plugins/kibana-time-plugin/package.json',
                'RUN mkdir -p /opt/soajs/deployer && mkdir -p /usr/share/kibana/config',
                'ADD ./deployer /opt/soajs/deployer',
                'RUN cd /opt/soajs/deployer && npm install',
                'CMD ["/bin/bash"]'
            ]
        },
        "java": {
            "from": "FROM tomcat:8.0-jre8-alpine",
            "maintainer": "MAINTAINER SOAJS Team <team@soajs.org>",
            "body": [
                'RUN apk add --no-cache curl nodejs nodejs-npm git && mkdir -p /opt/soajs/deployer/',
                'ADD ./deployer /opt/soajs/deployer',
                'RUN cd /opt/soajs/deployer && npm install',
                'CMD ["/bin/sh"]'
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
