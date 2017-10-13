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
                'CMD ["/bin/bash"]'
            ]
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
                'CMD ["/bin/bash"]'
            ]
        },
        "logstash": {
            "from": 'FROM docker.elastic.co/logstash/logstash:5.5.3',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                'USER root',
                'RUN yum -y install git curl && \\',
                    'curl --location https://rpm.nodesource.com/setup_6.x | bash - && \\',
                    'yum -y install nodejs',
                'RUN mkdir -p /opt/soajs/deployer',
                'ADD ./deployer /opt/soajs/deployer',
                'RUN cd /opt/soajs/deployer/ && npm install && chown -R logstash:logstash /opt',
                'USER logstash',
                'CMD ["/bin/bash"]'
            ]
        },
        "filebeat": {
            "from": "FROM docker.elastic.co/beats/filebeat:5.5.3",
            "maintainer": "MAINTAINER SOAJS Team <team@soajs.org>",
            "body": [
                'USER root',
                'ADD ./FILES/filebeat/filebeat.yml /usr/share/filebeat/filebeat.yml',
                'RUN chown filebeat:filebeat /usr/share/filebeat/filebeat.yml',
                'USER filebeat',
                'CMD ["/bin/bash"]',
                'ENTRYPOINT [ "/bin/bash", "-c", "filebeat -e -v -path.config /usr/share/filebeat/" ]'
            ]
        },
        "metricbeat": {
            "from": "FROM docker.elastic.co/beats/metricbeat:5.5.3",
            "maintainer": "MAINTAINER SOAJS Team <team@soajs.org>",
            "body": [
                'USER root',
                'RUN yum -y install git curl && \\',
                    'curl --location https://rpm.nodesource.com/setup_6.x | bash - && \\',
                    'yum -y install nodejs',
                'ADD ./deployer /opt/soajs/deployer/',
                'RUN cd /opt/soajs/deployer/ && npm install && chown -R metricbeat:metricbeat /opt /usr/share/metricbeat',
                'USER metricbeat',
                'CMD ["/bin/bash"]'
            ]
        },
        "kibana": {
            "from": "FROM docker.elastic.co/kibana/kibana:5.5.3",
            "maintainer": "MAINTAINER SOAJS Team <team@soajs.org>",
            "body": [
                'USER root',
                'RUN yum -y install git curl && \\',
                    'curl --location https://rpm.nodesource.com/setup_6.x | bash - && \\',
                    'yum -y install nodejs && \\',
                    'npm install --global bower',
                'WORKDIR /usr/share/kibana/plugins',
                'RUN git clone --branch 5.4 https://github.com/nreese/kibana-time-plugin.git && \\',
                    'cd /usr/share/kibana/plugins/kibana-time-plugin && \\',
                    'bower install --allow-root',
                'ADD ./FILES/kibana/package.json /usr/share/kibana/plugins/kibana-time-plugin/package.json',
                'RUN mkdir -p /opt/soajs/deployer',
                'ADD ./deployer /opt/soajs/deployer',
                'RUN cd /opt/soajs/deployer && npm install && chown -R kibana:kibana /opt /usr/share/kibana/config',
                'USER kibana',
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
        },
        "elasticsearch": {
            "from": "FROM docker.elastic.co/elasticsearch/elasticsearch:5.5.3",
            "maintainer": "MAINTAINER SOAJS Team <team@soajs.org>",
            "body": [
                'USER root',
                'ENV ES_WORKDIR=/usr/share/elasticsearch',
                'ENV READONLY_REST_ES_VERSION=es5.5.3',
                'RUN yum -y install git curl && \\',
                    'curl --location https://rpm.nodesource.com/setup_6.x | bash - && \\',
                    'yum -y install nodejs',
                'ADD ./FILES/es/readonlyrest-1.16.11_${READONLY_REST_ES_VERSION}.zip ${ES_WORKDIR}/',
                'RUN ${ES_WORKDIR}/bin/elasticsearch-plugin install file://${ES_WORKDIR}/readonlyrest-1.16.11_${READONLY_REST_ES_VERSION}.zip',
                'RUN mkdir -p /opt/soajs/deployer/',
                'ADD ./deployer /opt/soajs/deployer/',
                'RUN cd /opt/soajs/deployer && npm install && chown -R elasticsearch:elasticsearch /opt',
                'USER elasticsearch',
                'CMD ["/bin/sh"]'
            ]
        }
    },

    "errors": {
        "402": "No Uploaded files where detected.",
        "403": "Invalid file uploaded! make sure you zip your service before you upload it."
    },
    "schema": {}
};
