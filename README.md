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


**Environment variables**

======================== NGINX
SOAJS_NX_CONTROLLER_NB
SOAJS_NX_CONTROLLER_IP_N

SOAJS_NX_API_DOMAIN
SOAJS_NX_API_PORT

SOAJS_NX_SITE_DOMAIN
SOAJS_NX_SITE_PORT
SOAJS_NX_SITE_PATH

SOAJS_NX_OS

======================== MONGO
SOAJS_MONGO_RSNAME

SOAJS_MONGO_NB
SOAJS_MONGO_IP_N
SOAJS_MONGO_PORT_N

======================== GITHUB
SOAJS_GIT_OWNER
SOAJS_GIT_REPO
SOAJS_GIT_BRANCH

SOAJS_GIT_DASHBOARD_BRANCH
