'use strict';

const script = require('commander');
const log = require('util').log;
const path = require('path');

const config = require('./config.js');
const utils = require('./utils.js');
const version = require('./package.json').version;

script
    .version(version)
    .option('-T, --type <type>', '(required): Deployment type: nginx || service')
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
    let cloneOptions = {
        clonePath: config.paths.configRepo.path,
        repo: config.configRepo.git
    };
    utils.clone(cloneOptions, (error) => {
        if (error) throw new Error(error);

        deploy();
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

    if (script.type === 'service') {
        const service = require('./service');
        service.deployService(options, () => {}); //TODO: update callback function
    }
    else if (script.type === 'nginx') {
        options.nginx = config.nginx;
        const nginx = require('./nginx');
        nginx.deploy(options, () => {}); //TODO: update callback function
    }
}
