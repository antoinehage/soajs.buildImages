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
                'RUN cd /opt/soajs/FILES/conf && cp -f nginx.conf /etc/nginx/ && cp -f ssl.conf /etc/nginx/ssl/ && openssl dhparam -outform pem -out /etc/nginx/ssl/dhparam2048.pem 2048',
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