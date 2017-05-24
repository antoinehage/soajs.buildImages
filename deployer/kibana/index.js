/* jshint esversion: 6 */
'use strict';

const fs = require('fs');
const path = require('path');
const log = require('util').log;
const spawn = require('child_process').spawn;

const utils = require('../utils');

const kibana = {

    /**
     * Function that initializes the kibana deployer and detects custom kibana conf
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    init(options, cb) {
        log(`Starting kibana deployer ...`);
        let env = ((process.env.SOAJS_ENV) ? process.env.SOAJS_ENV.toLowerCase() : 'dev');

        if (options.config &&
            options.config.setup &&
            options.config.setup[env] &&
            options.config.setup[env].kibana &&
            options.config.setup[env].kibana.config &&
            options.config.setup[env].kibana.config.path) {

            let configPath = path.join(options.paths.configRepo.path, options.config.setup[env].kibana.config.path);
            //check that the config folder exists and is reachable
            fs.access(configPath, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
                if (error) {
                    log('Custom kibana config detected but is not reachable ...');
                    throw new Error(error);
                }

                //set a flag to indicate that custom config exists
                options.kibana.customConfig = true;
                //build default config that will be later overwritten by any custom files
                return kibana.getDefaultConf(options, cb);
            });
        }
        else {
            //set a flag to indicate that custom config does not exist
            options.kibana.customConfig = false;
            //build default config based on available templates
            return kibana.getDefaultConf(options, cb);
        }
    },

    /**
     * Function that sets default kibana conf and yml files based on available templates
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    getDefaultConf(options, cb) {
        log('Writing default configuration ...');
        options.source = 'template';
        options.content = 'kibana';
        options.target = options.kibana.configDir;
        utils.import(options, (error) => {
            if (error) throw new Error(error);

            return kibana.getCustomConf(options, cb);
        });
    },

    /**
     * Function that imports custom config that overwrites defaults (if any)
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    getCustomConf(options, cb) {
        log('Fetching custom configuration ...');
        if (options.kibana.customConfig) {
            options.source = 'repo';
            options.content = 'kibana';
            options.type = 'config';
            options.target = options.kibana.configDir;

            log('Writing custom configuration ...');
            utils.import(options, (error) => {
                if (error) throw new Error(error);

                return kibana.run(options, cb);
            });
        }
        else {
            log('No custom configuration found, proceeding ...');
            return kibana.run(options, cb);
        }
    },

    /**
     * Function that runs a kibana instance
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    run(options, cb) {
        let configDir = options.kibana.configDir;
        let configFile = path.join(configDir, 'kibana.yml');

        const kibana = spawn('kibana', [ '-c', configFile ], { stdio: 'inherit' });

        kibana.on('data', (data) => {
            console.log(data.toString());
        });

        kibana.on('close', (code) => {
            log(`Kibana process exited with code: ${code}`);
            return cb();
        });
        kibana.on('error', (error) => {
            log(`Kibana process failed with error: ${error}`);
            return cb(error);
        });
    }

};

module.exports = {
    deploy: kibana.init
};
