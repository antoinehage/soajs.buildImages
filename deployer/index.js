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
    .parse(process.argv);

if (config.deploy.types.indexOf(script.type) === -1) {
    log(`SOAJS deployer is not compatible with the provided type ${script.type}`);
    log(`Please choose one of ${config.deploy.types.join(', ')}. Exiting ...`);
    process.exit();
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

    }

    function deployService(options) {
        const service = require('./service');
        service.deployService(options, exitCb);
    }

    function deployNginx(options) {
        options.nginx = config.nginx;
        const nginx = require('./nginx');
        nginx.deploy(options, exitCb);
    }

    function deployNodejs(options) {
        options.nodejs = config.nodejs;
        const nodejs = require('./nodejs');
        nodejs.deploy(options, exitCb);
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
}

function exitCb() {
    log('Done, exiting ...');
}
