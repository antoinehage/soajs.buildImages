'use strict';
process.env.SOAJS_SOLO = true;
process.env.SOAJS_SRVIP = "localhost";

var soajs = require('soajs');
var config = require('./config.js');
var Docker = require('dockerode');
var fs = require('fs');
var crypto = require('crypto');
var ncp = require('ncp').ncp;
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var archiver = require('archiver');

//schema validation
var validatorSchemas = require("./schemas");
var core = require("soajs.core.modules").core;
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
            if (socket)
                docker = new Docker({socketPath: '/var/run/docker.sock'});
            else {
                var dockerHost = process.env.DOCKER_HOST;
                var anchor = dockerHost.lastIndexOf(":");

                docker = new Docker({
                    host: dockerHost.substr(anchor - 14, 14),
                    port: dockerHost.substr(anchor),
                    ca: fs.readFileSync(process.env.DOCKER_CERT_PATH + '/ca.pem'),
                    cert: fs.readFileSync(process.env.DOCKER_CERT_PATH + '/cert.pem'),
                    key: fs.readFileSync(process.env.DOCKER_CERT_PATH + '/key.pem')
                });
            }
            console.log(process.env.DOCKER_MACHINE_NAME);
            console.log(docker);

            return docker;
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
         * @param param {servicePath, dockerTpl, type, serviceInfo}
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
                archive.directory(rootFolder + 'deployer', 'deployer');
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
                        if (!exists)
                            return cb(packageFile + " not Found!");
                        fs.stat(packageFile, function (err, stats) {
                            if (err)
                                return tarFolder(rootFolder, serviceInfo);
                            else {
                                if (!stats.isFile())
                                    return cb(packageFile + " is not a file!");
                                validatePackageJSON(packageFile, validatorSchemas.package, function (err) {
                                    if (err)
                                        return cb(err.message);
                                    return tarFolder(rootFolder, serviceInfo);
                                });
                            }
                        });
                    });
                });
            }

            function validatePackageJSON(filePath, schema, cb) {
                var errMsgs = [];
                if (require.resolve(filePath))
                    delete require.cache[require.resolve(filePath)];
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
                    if (err)
                        return cb(err);
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
                                    lib.writeFiles({
                                        "src": config.FILES,
                                        "loc": rootFolder + "FILES/"
                                    }, function (err) {
                                        if (err) return cb(err.message);
                                        lib.writeFiles({
                                            "src": config.deployer,
                                            "loc": rootFolder + "deployer/"
                                        }, function (err) {
                                            if (err) return cb(err.message);
                                            if (param.type === "soajs" && path)
                                                handleServiceFiles(path, rootFolder, serviceInfo);
                                            else if (['nginx', 'logstash', 'filebeat', 'metricbeat', 'kibana', 'java'].indexOf(param.type) !== -1)
                                                tarFolder(rootFolder, serviceInfo);
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
                else
                    return cb("You need to have servicePort as well as serviceName in [" + path + "/config.js]");
            }

            if (param.servicePath) {
                lib.assurePath(param.servicePath, function (err, path) {
                    if (err) return cb(err.message);
                    return afterServiceInfo(param.serviceInfo, path);
                });
            }
            else
                return afterServiceInfo(param.serviceInfo, null);
        },
        /**
         *
         * @param param {servicePath, dockerTpl, type, serviceInfo, log, deleteFolder}
         * @param cb
         */
        "createImage": function (param, cb) {
            var imagePrefix = param.imagePrefix;
            lib.buildServiceTar({
                "type": param.type,
                "servicePath": param.servicePath,
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
                dockerTpl: config.dockerTemnplates.service,
                type: "service",
                socket: params.socket,
                log: params.log,
                deleteFolder: params.deleteFolder || null
            }, cb);
        }
    };
    service.get("/buildSoajs", function (req, res) {
        lib.createImage({
            imagePrefix: (req.query.imagePrefix ? req.query.imagePrefix + "/" : config.imagePrefix.core),
            servicePath: config.localSrcDir + "soajs",
            dockerTpl: config.dockerTemnplates.soajs,
            type: "soajs",
            serviceInfo: {
                "name": "soajs"
            },
            socket: req.query.socket || null,
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
            imagePrefix: (req.query.imagePrefix ? req.query.imagePrefix + "/" : config.imagePrefix.core),
            dockerTpl: config.dockerTemnplates.nginx,
            type: "nginx",
            serviceInfo: {
                "name": "nginx",
                "ports": "80 443"
            },
            socket: req.query.socket || null,
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildLogstash", function (req, res) {
        lib.createImage({
            imagePrefix: (req.query.imagePrefix ? req.query.imagePrefix + "/" : config.imagePrefix.core),
            dockerTpl: config.dockerTemnplates.logstash,
            type: "logstash",
            serviceInfo: {
                "name": "logstash"
            },
            socket: req.query.socket || null,
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildFilebeat", function (req, res) {
        lib.createImage({
            imagePrefix: (req.query.imagePrefix ? req.query.imagePrefix + "/" : config.imagePrefix.core),
            dockerTpl: config.dockerTemnplates.filebeat,
            type: "filebeat",
            serviceInfo: {
                "name": "filebeat"
            },
            socket: req.query.socket || null,
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildMetricbeat", function (req, res) {
        lib.createImage({
            imagePrefix: (req.query.imagePrefix ? req.query.imagePrefix + "/" : config.imagePrefix.core),
            dockerTpl: config.dockerTemnplates.metricbeat,
            type: "metricbeat",
            serviceInfo: {
                "name": "metricbeat"
            },
            socket: req.query.socket || null,
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildKibana", function (req, res) {
        lib.createImage({
            imagePrefix: (req.query.imagePrefix ? req.query.imagePrefix + "/" : config.imagePrefix.core),
            dockerTpl: config.dockerTemnplates.kibana,
            type: "kibana",
            serviceInfo: {
                "name": "kibana"
            },
            socket: req.query.socket || null,
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
    service.get("/buildJava", function (req, res) {
        lib.createImage({
            imagePrefix: (req.query.imagePrefix ? req.query.imagePrefix + "/" : config.imagePrefix.core),
            dockerTpl: config.dockerTemnplates.java,
            type: "java",
            serviceInfo: {
                "name": "java"
            },
            socket: req.query.socket || null,
            log: req.soajs.log,
            deleteFolder: req.query.delete || null
        }, function (err, data) {
            if (err)
                return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
            return res.status(200).send(data);
        });
    });
	service.get("/buildDockerAPI", function (req, res) {
		lib.createImage({
			imagePrefix: (req.query.imagePrefix ? req.query.imagePrefix + "/" : config.imagePrefix.core),
			dockerTpl: config.dockerTemnplates.dockerapi,
			type: "dockerapi",
			serviceInfo: {
				"name": "dockerapi"
			},
			socket: req.query.socket || null,
			log: req.soajs.log,
			deleteFolder: req.query.delete || null
		}, function (err, data) {
			if (err)
				return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": err}));
			return res.status(200).send(data);
		});
	});
    service.start();
});
