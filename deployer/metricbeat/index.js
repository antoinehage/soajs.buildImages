/* jshint esversion: 6 */
'use strict';

const fs = require('fs');
const path = require('path');
const log = require('util').log;
const spawn = require('child_process').spawn;

const utils = require('../utils');

const metricbeat = {

    /**
     * Function that initializes the metricbeat deployer and detects custom metricbeat conf
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    init(options, cb) {
        log(`Starting metricbeat deployer ...`);
        let env = ((process.env.SOAJS_ENV) ? process.env.SOAJS_ENV.toLowerCase() : 'dev');

        if (options.config &&
            options.config.setup &&
            options.config.setup[env] &&
            options.config.setup[env].metricbeat &&
            options.config.setup[env].metricbeat.config &&
            options.config.setup[env].metricbeat.config.path) {

            let configPath = path.join(options.paths.configRepo.path, options.config.setup[env].metricbeat.config.path);
            //check that the config folder exists and is reachable
            fs.access(configPath, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
                if (error) {
                    log('Custom metricbeat config detected but is not reachable ...');
                    throw new Error(error);
                }

                //set a flag to indicate that custom config exists
                options.metricbeat.customConfig = true;
                //build default config that will be later overwritten by any custom files
                return metricbeat.getDefaultConf(options, cb);
            });
        }
        else {
            //set a flag to indicate that custom config does not exist
            options.metricbeat.customConfig = false;
            //build default config based on available templates
            return metricbeat.getDefaultConf(options, cb);
        }
    },

    /**
     * Function that sets default metricbeat conf and yml files based on available templates
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    getDefaultConf(options, cb) {
        options.source = 'template';
        options.content = 'metricbeat';
        options.target = options.metricbeat.configDir;
        utils.import(options, (error) => {
            if (error) throw new Error(error);

            return metricbeat.getCustomConf(options, cb);
        });
    },

    /**
     * Function that imports custom config that overwrites defaults (if any)
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    getCustomConf(options, cb) {
        if (options.metricbeat.customConfig) {
            options.source = 'repo';
            options.content = 'metricbeat';
            options.type = 'config';
            options.target = options.metricbeat.configDir;
            utils.import(options, (error) => {
                if (error) throw new Error(error);

                return metricbeat.run(options, cb);
            });
        }
        else {
            return metricbeat.run(options, cb);
        }
    },

    /**
     * Function that runs a metricbeat instance
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    run(options, cb) {
        let configDir = options.metricbeat.configDir;
        let entrypoint = path.join(configDir, options.metricbeat.runScript);

        const metricbeat = spawn('sh', [ '-c', `cd ${configDir}; chmod +x ${options.metricbeat.runScript}; ./${options.metricbeat.runScript}` ], { stdio: 'inherit' });

        metricbeat.on('data', (data) => {
            console.log(data.toString());
        });

        metricbeat.on('close', (code) => {
            log(`Metricbeat process exited with code: ${code}`);
            return cb();
        });
        metricbeat.on('error', (error) => {
            log(`Metricbeat process failed with error: ${error}`);
            return cb(error);
        });
    }

};

module.exports = {
    deploy: metricbeat.init
};
