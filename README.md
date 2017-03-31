# soajs.buildImages

Provides the ability to build docker images for SOAJS framework and the Nginx Layer.

**Start the service**
```sh
$ cd soajs.buildImages
$ node .
```


**Build SOAJS Framework Image**
```sh
$ curl -X GET http://127.0.0.1:4100/buildSoajs
```


**Build Nginx Layer Image**
```sh
$ curl -X GET http://127.0.0.1:4100/buildNginx
```


### Environment variables

#### NGINX
ENV Variable | Description | Default | Example
--- | ----- | :---: | ---
SOAJS_NX_CONTROLLER_NB | This is a integer | [1] |
SOAJS_NX_CONTROLLER_IP_N | This is the IP for every controller |  | SOAJS_NX_CONTROLLER_IP_1
SOAJS_NX_DOMAIN | This is the master domain | [soajs.org] |
SOAJS_NX_API_DOMAIN | This is the domain for API | [api.soajs.org] |
SOAJS_NX_API_HTTPS | This is to turn on or off HTTPS: [0 - 1] | [0] |
SOAJS_NX_API_HTTP_REDIRECT | This is to redirect HTTP to HTTPS: [0 - 1] | [0] |
SOAJS_NX_SITE_DOMAIN | This is the domain for API |  |
SOAJS_NX_SITE_PATH | This is the path where to deploy the static content | [/opt/soajs/site] |
SOAJS_NX_SITE_HTTPS | This is to turn on or off HTTPS: [0 - 1] | [0] |
SOAJS_NX_SITE_HTTP_REDIRECT | This is to redirect HTTP to HTTPS: [0 - 1] | [0] |
SOAJS_NX_CUSTOM_SSL | This is to specify user-provided certificates: [0 - 1]| [0] |
SOAJS_NX_SSL_CERTS_LOCATION | This is to specify the location of user-provided certificates | [/etc/soajs/ssl] |
SOAJS_NX_SSL_SECRET | This is to specify the name of user-provided kubernetes secret that contains certificates | |
SOAJS_NX_OS | The OS. Default [ubuntu] |  |

#### MONGO
ENV Variable | Description | Default | Example
--- | ----- | :---: | ---
SOAJS_MONGO_RSNAME | This is the name of mongo replica | [rs_soajs] |
SOAJS_MONGO_NB | This is the number of Mongo instance(s) | [1]
SOAJS_MONGO_IP_N | This is the IP for every Mongo instance(s) |  | SOAJS_MONGO_IP_1
SOAJS_MONGO_PORT_N | This is the port for evert Mongo instance(s) | [27017] | SOAJS_MONGO_PORT_1
SOAJS_MONGO_USERNAME | This is the username for credentials |  |
SOAJS_MONGO_PASSWORD | This is the password for credentials |  |
SOAJS_MONGO_SSL | This is to turn on SSL | [false] |

#### GITHUB
ENV Variable | Description | Default | Example
--- | ----- | :---: | ---
SOAJS_GIT_OWNER | This is the GIT account owner name |  |
SOAJS_GIT_REPO | This is the GIT repo name |  |
SOAJS_GIT_BRANCH | This the GIT repo branch | [master] |
SOAJS_GIT_TOKEN | This is the GIT account token |  |
SOAJS_GIT_DASHBOARD_BRANCH | This is the GIT repo branch for soajs.dashboard | [ master] |

#### NODEJS
SOAJS_SRV_MEMORY | defines a custom value for nodejs memory limit
