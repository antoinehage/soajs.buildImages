/* jshint esversion: 6 */
'use strict';

const log = require('util').log;
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;

const utils = require('../utils');

const java = {

    /**
     * Function that checks for git environment variables and clones repository
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    init(options, cb) {
        if (options.java && options.java.git && options.java.git.owner && options.java.git.repo) {
            let repoTempDirPath = path.join(options.paths.tempFolders.temp.path, options.java.git.repo);
            fse.ensureDir(repoTempDirPath, (error) => {
                if (error) {
                    log(`An error occured while creating ${repoTempDirPath} ...`);
                    throw new Error(error);
                }

                let cloneOptions = {
                    repo: {
                        git: options.java.git
                    },
                    clonePath: repoTempDirPath
                };
                utils.clone(cloneOptions, (error) => {
                    if (error) throw new Error(error);

                    options.repoTempDirPath = repoTempDirPath;
                    return java.getAppArchive(options, cb);
                });
            });
        }
        else {
            log(`Missing required git information, found git owner: [${options.java.git.owner}], git repo: [${options.java.git.repo}], exiting ...`);
            return cb();
        }
    },

    /**
     * Function that gets .war file and sets it in the appropriate location
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    getAppArchive(options, cb) {
        log(`Moving .war file to ${options.paths.tomcat.webapps.path} ...`);
        let warFileName = path.basename(options.java.appArchivePath);
        let warFilePath = path.join(options.repoTempDirPath, options.java.appArchivePath);
        let destPath = path.join(options.paths.tomcat.webapps.path, warFileName);
        fse.copy(warFilePath, destPath, (error) => {
            if (error) throw new Error(error);

            return java.getDefaultConf(options, cb);
        });
    },

    /**
     * Function that gets default/template config files related to tomcat server and sets them
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    getDefaultConf(options, cb) {
        log('Writing default configuration ...');
        options.source = 'template';
        options.content = 'java';
        options.target = options.java.configDir;
        utils.import(options, (error) => {
            if (error) throw new Error(error);

            return java.checkCustomConf(options, cb);
        });
    },

    /**
     * Function that checks if custom/repo config files related to tomcat server is provided
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    checkCustomConf(options, cb) {
        log('Fetching custom configuration ...');
        let env = ((process.env.SOAJS_ENV) ? process.env.SOAJS_ENV.toLowerCase() : 'dev');

        if (options.config &&
            options.config.setup &&
            options.config.setup[env] &&
            options.config.setup[env].java &&
            options.config.setup[env].java.config &&
            options.config.setup[env].java.config.path) {

            let configPath = path.join(options.paths.configRepo.path, options.config.setup[env].java.config.path);
            //check that the config folder exists and is reachable
            fs.access(configPath, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
                if (error) {
                    log('Custom kibana config detected but is not reachable ...');
                    throw new Error(error);
                }

                return java.getCustomConf(options, cb);
            });
        }
        else {
            log('No custom configuration found, proceeding ...');
            return java.run(options, cb);
        }
    },

    /**
     * Function that gets custom/repo config files related to tomcat server
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    getCustomConf(options, cb) {
        options.source = 'repo';
        options.content = 'java';
        options.type = 'config';
        options.target = options.java.configDir;

        log('Writing custom configuration ...');
        utils.import(options, (error) => {
            if (error) throw new Error(error);

            return java.run(options, cb);
        });
    },

    /**
     * Function that runs tomcat server
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    run(options, cb) {
        log('Starting app ...');
        let startupFilePath = path.join(options.paths.tomcat.bin.path, 'catalina.sh');
        const tomcat = spawn(startupFilePath, [ 'run' ], { stdio: 'inherit' });

        tomcat.on('data', (data) => {
            console.log(data.toString());
        });

        tomcat.on('close', (code) => {
            log(`Tomcat process exited with code: ${code}`);
            return cb();
        });
        tomcat.on('error', (error) => {
            log(`Tomcat process failed with error: ${error}`);
            return cb(error);
        });
    }

};

module.exports = {
    deploy: java.init
};
