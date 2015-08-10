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