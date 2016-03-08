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
                //'RUN apt-get update && apt-get install -y nginx nodejs git && ln -s /usr/bin/nodejs /usr/bin/node && mkdir -p /opt/soajs/FILES/profiles',
                'RUN mkdir -p /opt/soajs/FILES/profiles',
                'ADD ./FILES /opt/soajs/FILES/',
                'RUN echo "daemon off;" >> /etc/nginx/nginx.conf',
                'ENV NODE_ENV=production',
                'EXPOSE #SERVICEPORT#',
                'CMD ["/bin/bash"]']
        },
        "soajs": {
            "from": 'FROM soajsorg/baseservice',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                //'RUN apt-get update && apt-get install -y nodejs npm git && ln -s /usr/bin/nodejs /usr/bin/node && mkdir -p /opt/soajs/node_modules && mkdir -p /opt/soajs/FILES/profiles',
                'RUN mkdir -p /opt/soajs/node_modules && mkdir -p /opt/soajs/FILES/profiles',
                'ADD ./FILES /opt/soajs/FILES/',
                'ENV NODE_ENV=production',
                'RUN cd /opt/soajs/FILES && cd ./#SERVICEFOLDERNAME# && npm install && cd ../ && mv ./#SERVICEFOLDERNAME# /opt/soajs/node_modules/',
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