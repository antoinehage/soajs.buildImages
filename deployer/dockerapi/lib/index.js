/* jshint esversion: 6 */

const url = require('url');
const log = require('util').log;
const async = require('async');
const request = require('request');
const Docker = require('dockerode');

const config = require('../config.js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const lib = {

    getDeployer(options) {
        if(options && options.targetNode) {
            return new Docker({
                protocol: 'https',
                host: options.ip,
                port: options.port || 2376,
                headers: {
                    'token': options.token
                }
            });
        }

        return new Docker({ socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock' });
    },

    returnError(res, options) {
        log(options.error);

        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ message: options.message }));
    },

    checkSwarmNetwork() {
        let deployer = lib.getDeployer();
        let network = deployer.getNetwork(config.network);
        network.inspect((error, networkInfo) => {
            if(error && error.statusCode !== 404) {
                log(error);
                log('Unable to get swarm network');
                return;
            }

            if(networkInfo && networkInfo.Id) {
                return lib.joinSwarmNetwork(networkInfo);
            }

            if(error && error.statusCode === 404) {
                log('Swarm network is not available yet on this node');
                setTimeout(lib.checkSwarmNetwork, 2500);
            }
        });
    },

    joinSwarmNetwork(swarmNetwork) {
        if(!swarmNetwork.Attachable) {
            log('Swarm network is not attachable, connecting to it is not possible');
            log('Maintenance operations will not work, containers are not reachable');
            return;
        }

        if(swarmNetwork.Scope !== 'swarm') {
            log('WARNING: network scope is not configured to "swarm"');
        }

        let deployer = lib.getDeployer();
        let targetNetwork = deployer.getNetwork(swarmNetwork.Id);
        targetNetwork.connect({ container: process.env.HOSTNAME }, (error) => {
            if(error) {
                log(error);
                log('Unable to connect to swarm network');
                log('Maintenance operations will not work, containers are not reachable');
                return;
            }

            log('Successfully connected to swarm network!');
        });
    },

    maintenance(req, res) {
        let params = url.parse(req.url, true).query;
        let deployer = lib.getDeployer();

        if(!params.id || !params.maintenancePort || !params.operation || !params.network) {
            return lib.returnError(res, {
                error: `Missing required params, given: ${JSON.stringify(params)}`,
                message: 'One or more parameters are missing. Make sure id, maintenancePort, operation, and network are provided'
            });
        }

        let deployerParams = {
            filters: { service: [ params.id ] }
        };

        deployer.listTasks(deployerParams, (error, tasks) => {
            if(error) {
                return lib.returnError(res, { error, message: 'Unable to list service tasks' });
            }

            async.map(tasks, (oneTask, callback) => {
                async.detect(oneTask.NetworksAttachments, (oneConfig, callback) => {
                    return callback(null, oneConfig.Network && oneConfig.Network.Spec && oneConfig.Network.Spec.Name === params.network);
                }, (error, networkInfo) => {
                    let taskInfo = {
                        id: oneTask.ID,
                        networkInfo: networkInfo
                    };
                    return callback(null, taskInfo);
                });
            }, (error, targets) => {
                async.map(targets, (oneTarget, callback) => {
                    if (!oneTarget.networkInfo || !oneTarget.networkInfo.Addresses || oneTarget.networkInfo.Addresses.length === 0) {
                        return callback(null, {
                            result: false,
                            ts: new Date().getTime(),
                            error: {
                                msg: 'Unable to get the ip address of the container'
                            }
                        });
                    }

                    let oneIp = oneTarget.networkInfo.Addresses[0].split('/')[0];
                    let requestOptions = {
                        uri: 'http://' + oneIp + ':' + params.maintenancePort + '/' + params.operation,
                        json: true
                    };
                    request.get(requestOptions, (error, response, body) => {
                        let operationResponse = {
                            id: oneTarget.id,
                            response: {}
                        };

                        if (error) {
                            operationResponse.response = {
                                result: false,
                                ts: new Date().getTime(),
                                error: error
                            };
                        }
                        else {
                            operationResponse.response = body;
                        }
                        return callback(null, operationResponse);
                    });
                }, (error, responses) => {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify (responses));
                });
            });
        });
    },

    metrics(req, res) {
    	let nodePort = config.paths.metrics.port[process.env.NODE_TYPE.toLowerCase()];
        let deployer = lib.getDeployer({targetNode: true, port: nodePort});
        deployer.listNodes((error, nodesList) => {
            if(error) {
                return lib.returnError(res, { error, message: 'Unable to list nodes' });
            }
	        
            async.concat(nodesList, (oneNode, callback) => {
            	let opts = { targetNode: true, port: nodePort, ip: oneNode.Status.Addr, token: req.headers['token'] }
	            let targetDeployer = lib.getDeployer(opts);
	            let targetDeployer2 = lib.getDeployer(opts);
                targetDeployer.listContainers({}, (error, containers) => {
                    if(error) {
                        return lib.returnError(res, { error, message: 'Unable to list containers' });
                    }

                    let params = { stream: false };
                    async.map(containers, (oneContainer, callback) => {
                        let container = targetDeployer2.getContainer(oneContainer.Id);
                        container.stats(params, (error, containerStats) => {
                            if(error) {
                                return lib.returnError(res, { error, message: 'Unable to get container stats' });
                            }

                            if(typeof containerStats === 'object' && oneContainer.Names && Array.isArray(oneContainer.Names) && oneContainer.Names.length > 0) {
                                containerStats.containerName = oneContainer.Names[0].replace(/^\//, "")
                            }
                            return callback(null, containerStats);
                        });
                    }, callback);
                });
            }, (error, stats) => {
                processServicesMetrics(stats, res);
            });
        });

        function processServicesMetrics(stats, res) {
			let servicesMetrics = {};
			async.each(stats, (oneStat, callback) => {
				if(typeof oneStat !== 'object'){
					return callback();
				}
				let usage = {
					cpuPercent: 0.00,
					memory: 0.00
				};
				try {
					const containerName = (oneStat.containerName) ? oneStat.containerName : (oneStat.name) ? oneStat.name.replace(/^\//, "") : "";
					usage.cpuPercent = getCPU(oneStat);
					usage.online_cpus = oneStat.precpu_stats.online_cpus;
					usage.memory = oneStat.memory_stats.usage;
					usage.memoryLimit = oneStat.memory_stats.limit;
					usage.memPercent = (usage.memory / usage.memoryLimit * 100).toFixed(2);
					usage.timestamp = oneStat.read;
					if(oneStat.blkio_stats.io_service_bytes_recursive){
						getBlockIO(oneStat.blkio_stats.io_service_bytes_recursive, usage);
					}
					if(oneStat.networks) {
						getNetIO(oneStat.networks, usage);
					}
					servicesMetrics[containerName] = usage;
				}
				catch (e) {
					return callback(e);
				}
				callback();
			}, function (error) {
                if(error) {
                    return lib.returnError(res, { error, message: 'Error occured while processing services metrics' });
                }

                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify (servicesMetrics));
			});
		}


		function getCPU(oneStat) {
			const postCpuStats = oneStat.cpu_stats;
			const preCpuStats = oneStat.precpu_stats;
			const cpuDelta = preCpuStats.cpu_usage.total_usage - postCpuStats.cpu_usage.total_usage;
			const systemDelta = preCpuStats.system_cpu_usage - postCpuStats.system_cpu_usage;
			const cpuPercent = ((cpuDelta / systemDelta) * preCpuStats.online_cpus * 100).toFixed(2);
			return isNaN(cpuPercent) ? 0 : cpuPercent
		}

		function getBlockIO(blk, usage) {
			blk.forEach(function (oneBlk) {
				if (oneBlk.op && (oneBlk.op === 'Read' || oneBlk.op === 'Write')) {
					usage["blk" + oneBlk.op] = oneBlk.value;
				}
			});
		}

		function getNetIO(nets, usage) {
			usage.netIn = 0;
			usage.netOut = 0;
			for (let oneNet in nets) {
				if (nets.hasOwnProperty(oneNet)) {
					if (nets[oneNet].hasOwnProperty("rx_bytes")) {
						usage.netIn += nets[oneNet].rx_bytes;
					}
					if (nets[oneNet].hasOwnProperty("tx_bytes")) {
						usage.netOut += nets[oneNet].tx_bytes;
					}
				}
			}
		}
    }

};

module.exports = lib;
