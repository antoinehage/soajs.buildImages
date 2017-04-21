'use strict';

const script = require('commander');
const log = require('util').log;

const config = require('./config.js');
const version = require('./package.json').version;

script
    .version(version)
    .option('-T, --type <type>', '(required): Deployment type: nginx || service')
    .parse(process.argv);

if (config.deploy.types.indexOf(script.type) === -1) {
    log(`SOAJS deployer is not compatible with the provided type ${script.type}`);
    log(`Please choose one of ${config.deploy.types.join(', ')}, exiting ...`);
    process.exit();
}

log(`Starting SOAJS Deployer v${version}`);
log(`Deploying a new ${script.type} instance ...`);

if (script.type === 'service') {
    require('./service');
}
else if (script.type === 'nginx') {
    require('./nginx');
}
