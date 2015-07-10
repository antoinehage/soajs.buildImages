'use strict';
var soajs = require('soajs');
var config = require('./config.js');
var Docker = require('dockerode');
var fs = require('fs');
var crypto = require('crypto');
var ncp = require('ncp').ncp;
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var archiver = require('archiver');
var unzip = require("unzip");
var formidable = require('formidable');
var util = require('util');

//schema validation
var validatorSchemas = require("./schemas");
var core = require("soajs/modules/soajs.core");
var validator = new core.validator.Validator();

var service = new soajs.server.service({"config": config});

service.init(function () {

    var lib = {
        assurePath: function (folder, cb) {
            if (folder[folder.length - 1] === "/")
                folder = folder.substr(0, folder.length - 1);
            fs.stat(folder, function (err, stats) {
                if (err) return cb(err, null);
                return cb(null, folder);
            });
        },
        "generateUniqueId": function (len, cb) {
            var id = "";
            try {
                id = crypto.randomBytes(len).toString('hex');
                cb(null, id);
            } catch (err) {
                cb(err);
            }
        },
        "getDocker": function (socket) {
            var docker = null;
            if (socket) {
                docker = new Docker({socketPath: '/var/run/docker.sock'});
            }
            else {
                docker = new Docker({
                    host: '192.168.59.103',
                    port: 2376,
                    ca: fs.readFileSync('certs/ca.pem'),
                    cert: fs.readFileSync('certs/cert.pem'),
                    key: fs.readFileSync('certs/key.pem')
                });
            }
            return docker;
        },
        getServiceInfo: function (param, cb) {
            try {
                delete require.cache[require.resolve(param.loc + "config.js")];
                var tmpConfig = require(param.loc + "config.js");

                var check = validator.validate(tmpConfig, validatorSchemas.config);
                if (!check.valid) {
                    return cb(null);
                }

                if (tmpConfig.servicePort && tmpConfig.serviceName) {
                    return cb({
                        "name": tmpConfig.serviceName,
                        "ports": tmpConfig.servicePort + " " + (tmpConfig.servicePort + param.maintenanceInc)
                    });
                }
                else
                    return cb(null);
            }
            catch (e) {
                return cb(null);
            }
        },
        writeProfiles: function (param, cb) {
            ncp.limit = 16;
            ncp(config.FILES + "profiles/", param.loc + 'profiles', function (err) {
                if (err) return cb(err.message);
                return cb(null);
            });
        },
        writeScripts: function (param, cb) {
            ncp.limit = 16;
            ncp(config.FILES + "scripts/", param.loc, function (err) {
                if (err) return cb(err.message);
                return cb(null);
            });
        },
        writeFiles: function (param, cb) {
            ncp.limit = 16;
            ncp(param.src, param.loc, function (err) {
                if (err) return cb(err.message);
                fs.stat(param.loc + "/.git", function (err, stats) {
                    if (err) return cb(null);
                    rimraf(param.loc + "/.git/", function (error) {
                        return cb(null);
                    });
                });
            });
        },
        writeDockerfile: function (param, cb) {
            var wstream = fs.createWriteStream(param.loc + 'Dockerfile');
            wstream.write(param.tpl.from + "\n");
            wstream.write(param.tpl.maintainer + "\n");
            for (var i = 0; i < param.tpl.body.length; i++) {
                var str = param.tpl.body[i];
                if (param.service.name)
                    str = str.replace(/#SERVICEFOLDERNAME#/g, param.service.name);
                if (param.service.ports)
                    str = str.replace(/#SERVICEPORT#/g, param.service.ports);
                wstream.write(str + "\n");
            }
            wstream.end();
            return cb(null);
        },
        /**
         *
         * @param param {servicePath, maintenanceInc, dockerTpl, type, serviceInfo}
         * @param cb
         */
        "buildServiceTar": function (param, cb) {
            function tarFolder(rootFolder, serviceInfo) {
                var output = fs.createWriteStream(rootFolder + "service.tar");
                var archive = archiver('tar');
                output.on('close', function () {
                    cb(null, {
                        "root": rootFolder,
                        "tar": rootFolder + "service.tar",
                        "serviceInfo": serviceInfo
                    });
                });
                archive.on('error', function (err) {
                    cb(err.message);
                });
                archive.pipe(output);
                archive.file(rootFolder + 'Dockerfile', {name: 'Dockerfile'});
                archive.directory(rootFolder + 'FILES', 'FILES');
                archive.finalize();
            }

            function handleServiceFiles(path, rootFolder, serviceInfo) {
                lib.writeFiles({
                    "src": path + "/",
                    "loc": rootFolder + "FILES/" + serviceInfo.name
                }, function (err) {
                    if (err) return cb(err.message);
                    var packageFile = rootFolder + "FILES/" + serviceInfo.name + "/package.json";

                    fs.exists(packageFile, function (exists) {
                        if (!exists) {
                            return cb(packageFile + " not Found!");
                        }

                        fs.stat(packageFile, function (err, stats) {
                            if (err)
                                return tarFolder(rootFolder, serviceInfo);
                            else {
                                if (!stats.isFile()) {
                                    return cb(packageFile + " is not a file!");
                                }

                                validatePackageJSON(packageFile, validatorSchemas.package, function (err) {
                                    if (err) {
                                        return cb(err.message);
                                    }

                                    return tarFolder(rootFolder, serviceInfo);
                                });
                            }
                        });
                    });
                });
            }

            function validatePackageJSON(filePath, schema, cb) {
                var errMsgs = [];
                if (require.resolve(filePath)) {
                    delete require.cache[require.resolve(filePath)];
                }
                var packageJSON = require(filePath);

                //validate package.json
                var check = validator.validate(packageJSON, schema);
                if (!check.valid) {
                    check.errors.forEach(function (oneError) {
                        errMsgs.push(oneError.stack);
                    });
                    return cb(new Error(errMsgs));
                }

                delete packageJSON.dependencies.soajs;
                fs.writeFile(filePath, JSON.stringify(packageJSON), "utf8", function (err) {
                    if (err) {
                        return cb(err);
                    }

                    return cb(null, true);
                });
            }

            function afterServiceInfo(serviceInfo, path) {
                if (serviceInfo) {
                    lib.generateUniqueId(16, function (err, fName) {
                        if (err) return cb(err.message);
                        var rootFolder = config.workingDir + fName + "/";
                        mkdirp(rootFolder + "FILES/", function (err) {
                            if (err) return cb(err.message);
                            fs.stat(rootFolder + "FILES/", function (err, stats) {
                                if (err) return cb("Unable to create working tar folder.");
                                lib.writeDockerfile({
                                    "loc": rootFolder,
                                    "service": serviceInfo,
                                    "tpl": param.dockerTpl
                                }, function (err) {
                                    if (err) return cb(err.message);
                                    lib.writeScripts({"loc": rootFolder + "FILES/"}, function (err) {
                                        if (err) return cb(err.message);
                                        if (param.type === "service" || param.type === "soajs") {
                                            if (param.type === "service") {
                                                lib.writeProfiles({"loc": rootFolder + "FILES/"}, function (err) {
                                                    if (err) return cb(err.message);
                                                    handleServiceFiles(path, rootFolder, serviceInfo);
                                                });
                                            }
                                            else {
                                                handleServiceFiles(path, rootFolder, serviceInfo);
                                            }
                                        }
                                        else if (param.type === "nginx" || param.type === "nginxdash") {
                                            lib.writeFiles({
                                                "src": path + "/",
                                                "loc": rootFolder + "FILES/nginx"
                                            }, function (err) {
                                                if (err) return cb(err.message);
                                                if (param.type === "nginxdash" && param.servicePath) {
                                                    lib.assurePath(param.servicePath, function (err, path2) {
                                                        console.log(path2)
                                                        if (err) return cb(err.message);
                                                        mkdirp(rootFolder + "FILES/soajs.dashboard/", function (err) {
                                                            if (err) return cb(err.message);
                                                            lib.writeFiles({
                                                                "src": path2 + "/",
                                                                "loc": rootFolder + "FILES/soajs.dashboard/ui"
                                                            }, function (err) {
                                                                if (err) return cb(err.message);
                                                                tarFolder(rootFolder, serviceInfo);
                                                            });
                                                        });
                                                    });
                                                }
                                                else
                                                    tarFolder(rootFolder, serviceInfo);
                                            });
                                        }
                                    });
                                });
                            });
                        });
                    });
                }
                else
                    return cb("You need to have servicePort as well as serviceName in [" + path + "/config.js]");
            }

            var serviceFolder = param.nginxPath || param.servicePath;
            lib.assurePath(serviceFolder, function (err, path) {
                if (err) return cb(err.message);
                if (param.serviceInfo) {
                    afterServiceInfo(param.serviceInfo, path);
                }
                else {
                    lib.getServiceInfo({
                        "loc": path + "/",
                        "maintenanceInc": param.maintenanceInc
                    }, function (serviceInfo) {
                        afterServiceInfo(serviceInfo, path);
                    });
                }
            });
        },
        /**
         *
         * @param param {nginxPath, servicePath, maintenanceInc, dockerTpl, type, serviceInfo, log, deleteFolder}
         * @param cb
         */
        "createImage": function (param, cb) {
            var imagePrefix = param.imagePrefix;
            var maintenanceInc = param.maintenanceInc;
            lib.buildServiceTar({
                "type": param.type,
                "servicePath": param.servicePath,
                "nginxPath": param.nginxPath,
                "maintenanceInc": maintenanceInc,
                "dockerTpl": param.dockerTpl,
                "serviceInfo": param.serviceInfo
            }, function (err, tarInfo) {
                if (err)
                    return cb(err);
                var imageName = imagePrefix + tarInfo.serviceInfo.name;
                var archiveFile = tarInfo.tar;

                var docker = lib.getDocker(param.socket);
                docker.buildImage(archiveFile, {t: imageName}, function (error, stream) {
                    if (error) {
                        param.log.error('createImage error: ', error);
                        return cb(error.message);
                    } else {
                        var data = '';
                        var chunk;
                        stream.setEncoding('utf8');
                        stream.on('readable', function () {
                            while ((chunk = stream.read()) != null) {
                                data += chunk;
                            }
                        });
                        stream.on('end', function () {
                            stream.destroy();
                            if (param.deleteFolder) {
                                rimraf(tarInfo.root, function (err) {
                                    return cb(null, data);
                                });
                            }
                            else
                                return cb(null, data);
                        });
                    }
                });
            });
        },
        "createService": function (params, cb) {
            lib.createImage({
                imagePrefix: params.imagePrefix,
                servicePath: params.servicePath,
                maintenanceInc: 1000,
                dockerTpl: config.dockerTemnplates.service,
                type: "service",
                log: params.log,
                deleteFolder: params.deleteFolder || null
            }, cb);
        }
    };
    service.get("/buildSoajs", function (req, res) {
        lib.createImage({
            imagePrefix: config.imagePrefix.core,
            servicePath: config.localSrcDir + "soajs",
            maintenanceInc: 1000,
            dockerTpl: config.dockerTemnplates.soajs,
            type: "soajs",
            serviceInfo: {
                "name": "soajs"
            },
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildNginx", function (req, res) {
        lib.createImage({
            imagePrefix: config.imagePrefix.core,
            nginxPath: config.FILES + "nginx",
            maintenanceInc: 1000,
            dockerTpl: config.dockerTemnplates.nginx,
            type: "nginx",
            serviceInfo: {
                "name": "nginx",
                "ports": "80 8080 8081 8082 8083"
            },
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    /*
    service.get("/buildAPINginx", function (req, res) {
        lib.createImage({
            imagePrefix: config.imagePrefix.core,
            nginxPath: config.FILES + "nginx",
            maintenanceInc: 1000,
            dockerTpl: config.dockerTemnplates.nginx,
            type: "nginx",
            serviceInfo: {
                "name": "nginxapi",
                "ports": "8080"
            },
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildController", function (req, res) {
        var maintenanceInc = 1000;
        lib.createImage({
            imagePrefix: config.imagePrefix.core,
            servicePath: config.localSrcDir + "soajs.controller",
            maintenanceInc: maintenanceInc,
            dockerTpl: config.dockerTemnplates.service,
            type: "service",
            serviceInfo: {
                "name": "controller",
                "ports": "4000 " + (4000 + maintenanceInc)
            },
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildUrac", function (req, res) {
        var params = {
            imagePrefix: config.imagePrefix.core,
            servicePath: config.localSrcDir + "soajs.urac",
            log: req.soajs.log,
            deleteFolder: req.query.delete
        };
        lib.createService(params, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildoAuth", function (req, res) {
        var params = {
            imagePrefix: config.imagePrefix.core,
            servicePath: config.localSrcDir + "soajs.oauth",
            log: req.soajs.log,
            deleteFolder: req.query.delete
        };
        lib.createService(params, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildDashboard", function (req, res) {
        var params = {
            imagePrefix: config.imagePrefix.core,
            servicePath: config.localSrcDir + "soajs.dashboard/service",
            log: req.soajs.log,
            deleteFolder: req.query.delete
        };
        lib.createService(params, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildDashboardNginx", function (req, res) {
        lib.createImage({
            imagePrefix: config.imagePrefix.core,
            servicePath: config.localSrcDir + "soajs.dashboard/ui",
            nginxPath: config.FILES + "nginx",
            maintenanceInc: 1000,
            dockerTpl: config.dockerTemnplates.nginxdash,
            type: "nginxdash",
            serviceInfo: {
                "name": "nginx",
                "ports": "80"
            },
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildGCS", function (req, res) {
        var maintenanceInc = 1000;
        lib.createImage({
            imagePrefix: config.imagePrefix.core,
            servicePath: config.localSrcDir + "soajs.GCS",
            maintenanceInc: maintenanceInc,
            dockerTpl: config.dockerTemnplates.gc,
            type: "service",
            serviceInfo: {
                "name": "gcs"
            },
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildCustomService", function (req, res) {
        var params = {
            imagePrefix: config.imagePrefix.core,
            servicePath: config.localSrcDir + req.query.name,
            log: req.soajs.log,
            deleteFolder: req.query.delete
        };
        lib.createService(params, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.post("/uploadCustomService", function (req, res) {
        var form = new formidable.IncomingForm();
        form.encoding = 'utf-8';
        form.uploadDir = config.uploadDir;
        form.keepExtensions = true;

        form.parse(req, function (err, fields, files) {
            if (err) {
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            }

            if (!files || Object.keys(files).length === 0) {
                rimraf(files[fileName].path, function(err){});
                return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]}));
            }

            var fileName = Object.keys(files)[0];
            if(files && fileName && files[fileName].type !== 'application/zip' && files[fileName].name.indexOf(".zip") === -1){
                rimraf(files[fileName].path, function(err){});
                return res.jsonp(req.soajs.buildResponse({"code": 403, "msg": config.errors[403]}));
            }

            //extract zip file & call lib.createService
            var srvTmpFolderName = fields.name;
            srvTmpFolderName = srvTmpFolderName.replace(/\s/g, '_').replace(/\W/gi, '-').toLowerCase();
            fs.createReadStream(files[fileName].path)
                .pipe(unzip.Extract({"path": config.uploadDir + srvTmpFolderName}))
                .on('close', function(){
                    createService(fileName, srvTmpFolderName, files);
                });
        });

        function createService(fileName, srvTmpFolderName, files){
            var params = {
                imagePrefix: config.imagePrefix.custom,
                servicePath: config.uploadDir + srvTmpFolderName + "/" + files[fileName].name.replace(".zip", ""),
                log: req.soajs.log,
                deleteFolder: true
            };

            lib.createService(params, function (err, data) {
                if (err){ return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));   }

                //remove extracted folder, remove zip file
                rimraf(config.uploadDir + srvTmpFolderName, function(err){
                    if (err){ return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err})); }

                    rimraf(files[fileName].path, function(err){
                        if (err){ return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err})); }

                        return res.json(req.soajs.buildResponse(null, data));
                    })
                });
            });
        }
    });
    service.get("/buildExamples", function (req, res) {
        var response = {};
        var params = {
            imagePrefix: config.imagePrefix.core,
            servicePath: config.localSrcDir + "soajs.examples/hello_world",
            log: req.soajs.log,
            deleteFolder: req.query.delete
        };
        lib.createService(params, function (err, data) {
            response["helloWorld"] = {"error": err, "data": data};

            params.servicePath = config.localSrcDir + "soajs.examples/example01";
            lib.createService(params, function (err, data) {
                response["example01"] = {"error": err, "data": data};

                params.servicePath = config.localSrcDir + "soajs.examples/example02";
                lib.createService(params, function (err, data) {
                    response["example02"] = {"error": err, "data": data};

                    params.servicePath = config.localSrcDir + "soajs.examples/example03";
                    lib.createService(params, function (err, data) {
                        response["example03"] = {"error": err, "data": data};

                        params.servicePath = config.localSrcDir + "soajs.examples/example04";
                        lib.createService(params, function (err, data) {
                            return res.json(req.soajs.buildResponse(null, response));
                        });
                    });
                });
            });
        });
    });
    */
    service.start();
});