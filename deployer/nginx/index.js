'use strict';

const log = require('util').log;
const async = require('async');
const spawn = require('child_process').spawn;

const config = require('../config.js');
const utils = require('../utils.js');
const ssl = require('./lib/certs.js');
const conf = require('./lib/conf.js');
const sites = require('./lib/sites.js');
const upstream = require('./lib/upstream.js');

function startNginx(cb) {
    const nginx = spawn('service', [ 'nginx', 'start' ]);

    nginx.stdout.on('data', (data) => {
        console.log(data);
    });
    nginx.stderr.on('data', (data) => {
        console.log(data);
    });

    nginx.on('close', (code) => {
        console.log (`Nginx process exited with code: ${code}`);
        return cb();
    });
    nginx.on('error', (error) => {
        console.log (`Nginx process failed with error: ${error}`);
        return cb(error);
    });
}

function getDashboardUI(cb) {
    if (process.env.SOAJS_ENV && process.env.SOAJS_ENV.toLowerCase() === 'dashboard') {
        if (process.env.SOAJS_GIT_DASHBOARD_BRANCH && process.env.SOAJS_GIT_DASHBOARD_BRANCH !== '') {
            // clone dashboard ui
            let cloneOptions = {
                repo: {
                    provider: 'github',
                    domain: 'github.com',
                    owner: 'soajs',
                    repo: 'soajs.dashboard',
                    branch: process.env.SOAJS_GIT_DASHBOARD_BRANCH
                },
                clonepath: config.paths.tempFolder.temp.path
            };

            utils.clone(cloneOptions, (error) => {
                if (error) throw new Error(error);

                let source = path.join(config.paths.tempFolders.temp.path, '/ui');
                let destination = path.join (config.nginx.siteLocation, '/');
                ncp(source, destination, { clobber: true }, (error) => {
                    if (error) {
                        log(`Unable to move contents of soajs/soajs.dashboard to ${destination} ...`);
                        throw new Error(error);
                    }

                    // delete contents of temp before cloning a new repository into it
                    rimraf(config.paths.tempFolders.temp.path, (error) => {
                        if (error) log(error);

                        return setTimeout(cb, 100);
                    })
                });
            });
        }
        else {
            return cb();
        }
    }
    else {
        return cb();
    }
}

const deploy = function (options, cb) {
    ssl.init(options, () => {
        conf.write(options, () => {
            upstream.getUpstream(options, () => {
                getDashboardUI(() => {
                    sites.getSites(options, () => {
                        startNginx(cb);
                    });
                });
            });
        });
    });
}

module.exports = deploy;
