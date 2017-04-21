'use strict';

const fs = require('fs');
const path = require('path');
const log = require('util').log;
const ncp = require('ncp');
const async = require('async');

const utils = require('../../utils.js');

let sites = {

    /**
     * Function that reads a custom repository's config.json and loads a json file that contains UI content that needs to be pulled
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    get(options, cb) {
        log('Fetching custom UI content ...');
        let env = process.env.SOAJS_ENV.toLowerCase() || 'dev';

        // if config repo contains sites.json file, require it
        if (options.config &&
            options.config.setup &&
            options.config.setup[env] &&
            options.config.setup[env].nginx &&
            options.config.setup[env].nginx.sites &&
            options.config.setup[env].nginx.sites.path) {

            let sitesPath = path.join(options.paths.configRepo.path, options.config.setup[env].nginx.sites.path);
            let sitesConfig = {};

            fs.access(sitesPath, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
                if (error) {
                    log('UI repositories config file detected but not reachable, skipping ...');
                    log('Unable to get custom UI config, make sure the path specified in the config.json file is correct and that the file exists ...');
                    log(error);
                    return cb();
                }

                try {
                    sitesConfig = require(sitesPath);
                }
                catch (e) {
                    log('An error occured while reading custom UI config file, aborting ...');
                    log(e);
                    return cb();
                }

                options.sitesConfig = sitesConfig;
                return sites.clone(options, cb);
            });
        }
    },

    /**
     * Function that generates required folder schema to clone several UI repos and then merge them into one
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    prepare(options, cb) {
        log('Creating temp folders ...');
        fs.rmdir(options.paths.tempFolders.temp.path, (error) => {
            if (error && error.code !== 'ENOENT') {
                log(`Unable to clean ${options.paths.tempFolders.temp.path} folder, proceeding anyways ...`);
                log(error);
            }

            fs.mkdir(options.paths.tempFolders.temp.path, (error) => {
                if (error && error.code !== 'EEXIST') {
                    log(`Unable to create ${options.paths.tempFolders.temp.path} folder, aborting ...`);
                    log(error);
                    return cb();
                }

                fs.rmdir(options.paths.tempFolders.tempSite.path, (error) => {
                    if (error && error.code !== 'ENOENT') {
                        log(`Unable to clean ${options.paths.tempFolders.tempSite.path} folder, proceeding anyways ...`);
                        log(error);
                    }

                    fs.mkdir(options.paths.tempFolders.tempSite.path, (error) => {
                        if (error && error.code !== 'EEXIST') {
                            log(`Unable to create ${options.paths.tempFolders.tempSite.path} folder, aborting ...`);
                            log(error);
                            return cb();
                        }

                        return sites.clone(options, cb);
                    }});
                });
            });
        });

    },

    /**
     * Function that clones from several repositories and merges all into one folder
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    clone(options, cb) {
        log(`Cloning ${options.sitesConfig.sites.length} UI repositories ...`);

        async.eachSeries(options.sitesConfig.sites, (oneSite, callback) => {
            let cloneOptions = {
                repo: oneSite,
                clonePath: options.paths.tempFolders.temp.path
            };

            log(`Cloning ${oneSite.owner}/${oneSite.repo} ...`);
            utils.clone(cloneOptions, (error) => {
                if (error) {
                    return callback(error)
                }

                let source = path.join(options.paths.tempFolders.temp.path, '/');
                let destination = path.join (options.paths.tempFolders.tempSite.path, '/');
                ncp(source, destination, { clobber: true }, (error) => {
                    if (error) {
                        log(`Unable to move contents of ${oneSite.owner}/${oneSite.repo} to ${options.paths.tempFolders.tempSite.path}, skipping ...`);
                        log(error);
                    }

                    return callback();
                });
            });
        }, (error) => {
            if (error) {
                log(error);
                return cb();
            }

            return sites.finalize(options, cb);
        });
    },

    /**
     * Function that moves UI content from temp folder to the nginx site location
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    finalize(options, cb) {
        let nxPath = config.nginx.siteLocation;
        let tempPath = path.join(options.paths.tempFolders.temp.path, '/');
        let tempSitePath = path.join (options.paths.tempFolders.tempSite.path, '/');
        ncp(tempSitePath, nxPath, { clobber: true }, (error) => {
            if (error) {
                log(`Unable to move temp_site contents to ${nxPath}`);
                throw new Error(error);
            }

            fs.rmdir(tempSitePath, (error) => {
                if (error) {
                    log(`Unable to delete ${tempSitePath}`);
                    log(error);
                }

                fs.rmdir(tempPath, (error) => {
                    if (error) {
                        log(`Unable to delete ${tempPath}`);
                        log(error);
                    }

                    log('Cloning custom UI sites completed ...');
                    return cb();
                });
            });
        });
    }

};

module.exports = {
    getSites: sites.get
};
