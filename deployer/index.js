/* jshint esversion: 6 */
'use strict';

const script = require('commander');
const log = require('util').log;
const path = require('path');
const fs = require('fs');

const config = require('./config.js');
const utils = require('./utils');
const version = require('./package.json').version;

script
    .version(version)
    .option('-T, --type <type>', '(required): Deployment type')
    .option('-S, --step [step]', '(optional): Deployment step')
    .parse(process.argv);

if (config.deploy.types.indexOf(script.type) === -1) {
    log(`SOAJS deployer is not compatible with the provided type ${script.type}`);
    log(`Please choose one of ${config.deploy.types.join(', ')}. Exiting ...`);
    process.exit();
}
if (script.step) {
    if (config.deploy.steps.indexOf(script.step) === -1) {
        log(`SOAJS deployer is not compatible with the provided step ${script.steps}`);
        log(`Please choose one of ${config.deploy.steps.join(', ')}. Exiting ...`);
        process.exit();
    }
}
log(`Starting SOAJS Deployer v${version}`);

log(`Looking for configuration repository settings ...`)
if (process.env.SOAJS_CONFIG_REPO_OWNER && process.env.SOAJS_CONFIG_REPO_NAME) {
    log('Configuration repository detected, cloning ...');
    fs.mkdir(config.paths.configRepo.path, (error) => {
        if (error) throw new Error(error);

        let cloneOptions = {
            clonePath: config.paths.configRepo.path,
            repo: { git: config.configRepo.git }
        };
        utils.clone(cloneOptions, (error) => {
            if (error) throw new Error(error);

            deploy();
        });
    });
}
else {
    log(`No configuration repository detected, proceeding ...`);
    deploy();
}

function deploy() {
    log(`Deploying a new ${script.type} instance ...`);
    let options = { paths: config.paths };

    if (script.step) {
        options.step = script.step;
    }

    try {
        if (process.env.SOAJS_CONFIG_REPO_OWNER && process.env.SOAJS_CONFIG_REPO_NAME) {
            options.config = require(path.join(config.paths.configRepo.path, 'config.json'));
        }
    }
    catch (e) {
        log('Unable to load config.json from configuration repository ...');
        throw new Error(e);
    }

    switch (script.type) {

        case 'service':
            deployService(options);
            break;

        case 'nginx':
            deployNginx(options);
            break;

        case 'nodejs':
            deployNodejs(options);
            break;

        case 'java':
            deployJava(options);
            break;

        case 'profile':
            generateProfile(options);
            break;

        case 'metricbeat':
            deployMetricbeat(options);
            break;

        case 'logstash':
            deployLogstash(options);
            break;

        case 'kibana':
            deployKibana(options);
            break;

	    case 'dockerapi':
		    deployDockerAPI(options);
		    break;

        case 'golang':
		    deployGolang(options);
		    break;

    }

    function deployService(options) {
        const service = require('./service');
        service.deployService(options, exitCb);
    }

    function deployNginx(options) {
        options.nginx = config.nginx;
        const nginx = require('./nginx');
        if (options.step) {
            if (options.step === 'deploy')
                nginx.deploy(options, exitCb);
            if (options.step === 'install')
                nginx.install(options, exitCb);
            if (options.step === 'run')
                nginx.run(options, exitCb);
        }
        else {
            nginx.deploy(options, ()=>{
                nginx.install(options, ()=>{
                    nginx.run(options, exitCb);
                });
            });
        }
        nginx.deploy(options, exitCb);
    }

    function deployNodejs(options) {
        options.nodejs = config.nodejs;
        const nodejs = require('./nodejs');
        //nodejs.deploy(options, exitCb);
        if (options.step) {
            if (options.step === 'deploy')
                nodejs.deploy(options, exitCb);
            if (options.step === 'install')
                nodejs.install(options, exitCb);
            if (options.step === 'run')
                nodejs.run(options, exitCb);
        }
        else {
            nodejs.deploy(options, ()=>{
                nodejs.install(options, ()=>{
                    nodejs.run(options, exitCb);
                });
            });
        }
    }

    function deployJava(options) {
        options.java = config.java;
        const java = require('./java');
        java.deploy(options, exitCb);
    }

    function generateProfile(options) {
        const profile = require('./profile');
        profile.getProfile(options, exitCb);
    }

    function deployMetricbeat(options) {
        options.metricbeat = config.metricbeat;
        const metricbeat = require('./metricbeat');
        metricbeat.deploy(options, exitCb);
    }

    function deployLogstash(options) {
        options.logstash = config.logstash;
        const logstash = require('./logstash');
        logstash.deploy(options, exitCb);
    }

    function deployKibana(options) {
        options.kibana = config.kibana;
        const kibana = require('./kibana');
        kibana.deploy(options, exitCb);
    }

	function deployDockerAPI(options){
        options.dockerapi = config.dockerapi;
		const dockerapi = require('./dockerapi');
		dockerapi.deploy(options, exitCb);
	}

    function deployGolang(options){
        options.golang = config.golang;
		const golang = require('./golang');

        if (options.step) {
            if (options.step === 'deploy')
                golang.deploy(options, exitCb);
            if (options.step === 'install')
                golang.install(options, exitCb);
            if (options.step === 'run')
                golang.run(options, exitCb);
        }
        else {
            golang.deploy(options, ()=>{
                golang.install(options, ()=>{
                    golang.run(options, exitCb);
                });
            });
        }
	}
}

function exitCb() {
    log('Done, exiting ...');
}
