module.exports = {
    serviceName: "buildImages",
    servicePort: 4100,
    extKeyRequired: false,

    "FILES": __dirname + "/FILES/",
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
                'RUN mkdir -p /opt/soajs/FILES/profiles && mkdir -p /etc/nginx/ssl',
                'ADD ./FILES /opt/soajs/FILES/',
                'RUN cd /opt/soajs/FILES/conf && cp -f nginx.conf /etc/nginx/ && cp -f ssl.conf /etc/nginx/ssl/',
                'RUN apt-get update && apt-get install curl',
                'RUN curl -L -O https://download.elastic.co/beats/filebeat/filebeat_1.3.1_amd64.deb && dpkg -i filebeat_1.3.1_amd64.deb',
                'RUN curl -L -O https://download.elastic.co/beats/topbeat/topbeat_1.3.1_amd64.deb && dpkg -i topbeat_1.3.1_amd64.deb',
                'ADD ./FILES/conf/filebeat.yml /etc/filebeat/',
                'ADD ./FILES/conf/topbeat.yml /etc/topbeat/',
                'ENV NODE_ENV=production',
                'EXPOSE #SERVICEPORT#',
                'CMD ["/bin/bash"]']
        },
        "soajs": {
            "from": 'FROM soajsorg/baseservice',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                'RUN mkdir -p /opt/soajs/node_modules && mkdir -p /opt/soajs/FILES/profiles',
                'ADD ./FILES /opt/soajs/FILES/',
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
        }
    },

    "errors": {
        "402": "No Uploaded files where detected.",
        "403": "Invalid file uploaded! make sure you zip your service before you upload it."
    },
    "schema": {
    }
};
