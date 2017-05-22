/* jshint esversion: 6 */
'use strict';

const fs = require('fs');
const path = require('path');
const log = require('util').log;
const spawn = require('child_process').spawn;

const utils = require('../utils');

let logstash = {

    /**
     * Function that initializes the logstash deployer and detects custom logstash conf
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    init(options, cb) {
        log(`Starting logstash deployer ...`);
        let env = ((process.env.SOAJS_ENV) ? process.env.SOAJS_ENV.toLowerCase() : 'dev');

        if (options.config &&
            options.config.setup &&
            options.config.setup[env] &&
            options.config.setup[env].logstash &&
            options.config.setup[env].logstash.config &&
            options.config.setup[env].logstash.config.path) {

            let configPath = path.join(options.paths.configRepo.path, options.config.setup[env].logstash.config.path);
            //check that the config folder exists and is reachable
            fs.access(configPath, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
                if (error) {
                    log('Custom logstash config detected but is not reachable ...');
                    throw new Error(error);
                }

                //set a flag to indicate that custom config exists
                options.logstash.customConfig = true;
                //build default config that will be later overwritten by any custom files
                return logstash.getDefaultConf(options, cb);
            });
        }
        else {
            //set a flag to indicate that custom config does not exist
            options.logstash.customConfig = false;
            //build default config based on available templates
            return logstash.getDefaultConf(options, cb);
        }
    },

    /**
     * Function that sets default logstash conf and yml files based on available templates
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    getDefaultConf(options, cb) {
        options.source = 'template';
        options.content = 'logstash';
        options.target = options.logstash.configDir;
        utils.import(options, (error) => {
            if (error) throw new Error(error);

            return logstash.getCustomConf(options, cb);
        });
    },

    /**
     * Function that imports custom config that overwrites defaults (if any)
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    getCustomConf(options, cb) {
        if (options.logstash.customConfig) {
            options.source = 'repo';
            options.content = 'logstash';
            options.type = 'config';
            options.target = options.logstash.configDir;
            utils.import(options, (error) => {
                if (error) throw new Error(error);

                return logstash.run(options, cb);
            });
        }
        else {
            return logstash.run(options, cb);
        }
    },

    /**
     * Function that runs a logstash instance
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    run(options, cb) {
        let configDir = options.logstash.configDir;
        let configFile = path.join(configDir, 'logstash.conf');

        const logstash = spawn('logstash', [ '-f', configFile ], { stdio: 'inherit' });

        logstash.on('data', (data) => {
            console.log(data.toString());
        });

        logstash.on('close', (code) => {
            log(`Logstash process exited with code: ${code}`);
            return cb();
        });
        logstash.on('error', (error) => {
            log(`Logstash process failed with error: ${error}`);
            return cb(error);
        });
    }

};

module.exports = {
    deploy: logstash.init
};
