'use strict';

const log = require('util').log;
const async = require('async');
const spawn = require('child_process').spawn;

const config = require('../config.js');
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
    //TODO: implement
}

const deploy = function (options, cb) {
    ssl.init(options, () => {
        conf.write(options, () => {
            upstream.getUpstream(options, () => {
                getDashboardUI(options, () => {
                    sites.getSites(options, () => {
                        startNginx(cb);
                    });
                });
            });
        });
    });
}

module.exports = deploy;
