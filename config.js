module.exports = {
    serviceName: "buildImages",
    servicePort: 4100,
    extKeyRequired: false,

    "FILES": __dirname + "/FILES/",
    "workingDir": "/opt/tmp/",
    "localSrcDir": "/opt/soajs/node_modules/",

    "imagePrefix": "local/",

    "dockerTemnplates": {
        "nginx": {
            "from": 'FROM ubuntu',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                'RUN apt-get update && apt-get install -y nginx nodejs && ln -s /usr/bin/nodejs /usr/bin/node && mkdir -p /opt/soajs/FILES',
                'RUN echo "daemon off;" >> /etc/nginx/nginx.conf',
                'ADD ./FILES /opt/soajs/FILES/',
                'RUN chmod +x /opt/soajs/FILES/runNginx.sh',
                'EXPOSE #SERVICEPORT#',
                'CMD /opt/soajs/FILES/runNginx.sh']
        },
        "gc": {
            "from": 'FROM local/soajs',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                'ADD ./FILES /opt/soajs/FILES/',
                'ENV NODE_ENV=production',
                'RUN cd /opt/soajs/FILES && cd ./#SERVICEFOLDERNAME# && npm install && cd ../ && mv ./#SERVICEFOLDERNAME# /opt/soajs/node_modules/ && chmod +x /opt/soajs/FILES/runService.sh',
                'CMD ["/opt/soajs/FILES/runService.sh", "/opt/soajs/node_modules/#SERVICEFOLDERNAME#/index.js"]']
        },
        "service": {
            "from": 'FROM local/soajs',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                'ADD ./FILES /opt/soajs/FILES/',
                'ENV NODE_ENV=production',
                'RUN cd /opt/soajs/FILES && cd ./#SERVICEFOLDERNAME# && npm install && cd ../ && mv ./#SERVICEFOLDERNAME# /opt/soajs/node_modules/ && chmod +x /opt/soajs/FILES/runService.sh',
                'EXPOSE #SERVICEPORT#',
                'CMD ["/opt/soajs/FILES/runService.sh", "/opt/soajs/node_modules/#SERVICEFOLDERNAME#/index.js"]']
        },
        "nginxdash": {
            "from": 'FROM ubuntu',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                'RUN apt-get update && apt-get install -y nginx nodejs && ln -s /usr/bin/nodejs /usr/bin/node && mkdir -p /opt/soajs/node_modules && mkdir -p /opt/soajs/FILES',
                'RUN echo "daemon off;" >> /etc/nginx/nginx.conf',
                'ADD ./FILES /opt/soajs/FILES/',
                'RUN cd /opt/soajs/FILES && mv ./soajs.dashboard /opt/soajs/node_modules/ && chmod +x /opt/soajs/FILES/runNginx.sh',
                'EXPOSE #SERVICEPORT#',
                'CMD /opt/soajs/FILES/runNginx.sh']
        },
        "soajs": {
            "from": 'FROM ubuntu',
            "maintainer": 'MAINTAINER SOAJS Team <team@soajs.org>',
            "body": [
                'RUN apt-get update && apt-get install -y nodejs npm && ln -s /usr/bin/nodejs /usr/bin/node && mkdir -p /opt/soajs/node_modules && mkdir -p /opt/soajs/FILES && mkdir /opt/node_modules',
                'ADD ./FILES /opt/soajs/FILES/',
                'ENV NODE_ENV=production',
                'RUN cd /opt/soajs/FILES && cd ./#SERVICEFOLDERNAME# && npm install && mv ./node_modules/* /opt/node_modules/ && cd ../ && mv ./#SERVICEFOLDERNAME# /opt/soajs/node_modules/',
                'CMD ["/bin/bash"]']
        }
    },

    "errors": {},
    "schema": {
        "/buildSoajsImage": {
            "_apiInfo": {
                "l": "Dockernize soajs core"
            },
            "vLabel": {
                "source": ['query.vLabel'],
                "required": false,
                "validation": {
                    "type": "string"
                }
            },
            "vForce": {
                "source": ['query.vForce'],
                "required": false,
                "validation": {
                    "type": "boolean"
                }
            }
        },
        "/buildServiceImage": {
            "_apiInfo": {
                "l": "Dockernize a soajs service"
            },
            "serviceFolderName": {
                "source": ['query.serviceFolderName'],
                "required": true,
                "validation": {
                    "type": "string"
                }
            },
            "vLabel": {
                "source": ['query.vLabel'],
                "required": false,
                "validation": {
                    "type": "string"
                }
            },
            "vForce": {
                "source": ['query.vForce'],
                "required": false,
                "validation": {
                    "type": "boolean"
                }
            }
        },
        "/buildNginx": {
            "_apiInfo": {
                "l": "Dockernize a soajs nginx"
            },
            "serviceFolderName": {
                "source": ['query.serviceFolderName'],
                "required": true,
                "validation": {
                    "type": "string"
                }
            },
            "vLabel": {
                "source": ['query.vLabel'],
                "required": false,
                "validation": {
                    "type": "string"
                }
            },
            "vForce": {
                "source": ['query.vForce'],
                "required": false,
                "validation": {
                    "type": "boolean"
                }
            }
        },
        "/buildAll": {
            "_apiInfo": {
                "l": "Dockernize soajs core and all soajs services"
            },
            "vLabel": {
                "source": ['query.vLabel'],
                "required": false,
                "validation": {
                    "type": "string"
                }
            },
            "vForce": {
                "source": ['query.vForce'],
                "required": false,
                "validation": {
                    "type": "boolean"
                }
            },
            "push": {
                "source": ['query.push'],
                "required": false,
                "validation": {
                    "type": "boolean"
                }
            }
        }
    }
};