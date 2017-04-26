'use strict';

const log = require('util').log;
const path = require('path');
const async = require('async');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;

const config = require('../config.js');
const utils = require('../utils.js');
const ssl = require('./lib/certs.js');
const conf = require('./lib/conf.js');
const sites = require('./lib/sites.js');
const importer = require('./lib/importer.js');

/**
 * Function that runs nginx service and prints logs to stdout
 * @param  {Function} cb Callback Function
 *
 */
function startNginx(cb) {
    const nginx = spawn('service', [ 'nginx', 'start' ], { stdio: 'inherit' });

    nginx.on('data', (data) => {
        console.log(data.toString());
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

/**
 * Function that clones UI passed as environment variables only (not sites.json config)
 * @param  {Object}   options Object that contains the type of the UI module and its git information
 * @param  {Function} cb      Callback Function
 *
 */
function getUI(options, cb) {
    let gitInfo = {};
    // if requested UI is dashboard ui, check if valid before cloning it
    if (options.type === 'dashboard') {
        if (!process.env.SOAJS_ENV && process.env.SOAJS_ENV.toLowerCase() !== 'dashboard') return cb();
        if (!process.env.SOAJS_GIT_DASHBOARD_BRANCH || process.env.SOAJS_GIT_DASHBOARD_BRANCH === '') return cb();

        gitInfo = config.dashboard.git;
    }
    else {
        if (!process.env.SOAJS_GIT_OWNER || !process.env.SOAJS_GIT_REPO) {
            log('No or missing git information for custom UI, no custom UI to clone ...');
            return cb();
        }

        gitInfo = {
            provider: process.env.SOAJS_GIT_PROVIDER || 'github',
            domain: process.env.SOAJS_GIT_DOMAIN || 'github.com',
            owner: process.env.SOAJS_GIT_OWNER,
            repo: process.env.SOAJS_GIT_REPO,
            branch: process.env.SOAJS_GIT_BRANCH || 'master',
            path: process.env.SOAJS_GIT_PATH || '/'
        };
    }

    // clone ui
    let cloneOptions = {
        repo: {
            git: {
                provider: gitInfo.provider,
                domain: gitInfo.domain,
                owner: gitInfo.owner,
                repo: gitInfo.repo,
                branch: gitInfo.branch
            }
        },
        clonePath: config.paths.tempFolders.temp.path
    };

    log(`Cloning ${gitInfo.owner}/${gitInfo.repo} ...`);
    utils.clone(cloneOptions, (error) => {
        if (error) throw new Error(error);

        let source = path.join(config.paths.tempFolders.temp.path, gitInfo.path || '/');
        let destination = path.join (config.nginx.siteLocation, '/');
        fse.copyRecursive(source, destination, (error) => {
            if (error) {
                log(`Unable to move contents of ${gitInfo.owner}/${gitInfo.repo} to ${destination} ...`);
                throw new Error(error);
            }

            // delete contents of temp before cloning a new repository into it
            fse.rmrf(config.paths.tempFolders.temp.path, (error) => {
                if (error) throw new Error(error);

                log(`${gitInfo.owner}/${gitInfo.repo} cloned successfully ...`);
                return setTimeout(cb, 100);
            });
        });
    });
}

const exp = {

    deploy(options, cb) {
        ssl.init(options, () => {
            conf.write(options, () => {
                let nxOs = options.nginx.os;

                options.type = 'upstream';
                options.targetDir = options.nginx.location + ((nxOs === 'mac') ? "/servers/" : ( nxOs === 'ubuntu') ? "/conf.d/" : "/nginx/");
                options.isDirectory = true;
                importer.import(options, () => {
                    options.type = 'sites-enabled';
                    options.targetDir = options.nginx.location + ((nxOs === 'mac') ? "/servers/" : ( nxOs === 'ubuntu') ? "/sites-enabled/" : "/nginx/");
                    options.isDirectory = true;
                    importer.import(options, () => {
                        options.type = 'conf';
                        options.targetDir = options.nginx.location;
                        options.isDirectory = false;
                        importer.import(options, () => {
                            // Get dashboard UI if dashboard nginx, check for validity is done in the getUI() function
                            getUI({ type: 'dashboard' }, () => {
                                //Get custom UI module if user specified source as environment variables (this is not related to sites.json config)
                                getUI({ type: 'custom' }, () => {
                                    // Get custom UI sites if any
                                    sites.getSites(options, () => {
                                        // Start nginx
                                        startNginx(cb);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

};

module.exports = exp;
