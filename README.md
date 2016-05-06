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
SOAJS_NX_CONTROLLER_NB          This is a integer. Default is [1]
SOAJS_NX_CONTROLLER_IP_N        This is the IP for every controller.

SOAJS_NX_API_DOMAIN             This is the domain for API. Default [api.soajs.org]
SOAJS_NX_API_HTTPS              This is to turn on or off HTTPS: [0 || 1] . Default [0]
SOAJS_NX_API_HTTP_REDIRECT      This is to redirect HTTP to HTTPS: [0 || 1] . Default [0]

SOAJS_NX_SITE_DOMAIN            This is the domain for API.
SOAJS_NX_SITE_PATH              This is the path where to deploy the static content. Default [/opt/soajs/site]
SOAJS_NX_SITE_HTTPS             This is to turn on or off HTTPS: [0 || 1] . Default [0]
SOAJS_NX_SITE_HTTP_REDIRECT     This is to redirect HTTP to HTTPS: [0 || 1] . Default [0]

SOAJS_NX_OS                     The OS. Default [ubuntu]


======================== MONGO
SOAJS_MONGO_RSNAME

SOAJS_MONGO_NB
SOAJS_MONGO_IP_N
SOAJS_MONGO_PORT_N

======================== GITHUB
SOAJS_GIT_OWNER                 This is the GIT account owner name.
SOAJS_GIT_REPO                  This is the GIT repo name
SOAJS_GIT_BRANCH                This the GIT repo branch. Default [master]
SOAJS_GIT_TOKEN                 This is the GIT account token.

SOAJS_GIT_DASHBOARD_BRANCH      This is the GIT repo branch for soajs.dashboard. Default [ master]
