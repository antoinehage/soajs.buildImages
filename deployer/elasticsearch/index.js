/* jshint esversion: 6 */
'use strict';

const fs = require('fs');
const path = require('path');
const log = require('util').log;
const spawn = require('child_process').spawn;

const utils = require('../utils');

const elasticsearch = {

	/**
	 * Function that initializes the elasticsearch deployer and detects custom elasticsearch conf
	 * @param  {Object}   options An object that contains params passed to the function
	 * @param  {Function} cb      Callback function
	 *
	 */
	init(options, cb) {
		log(`Starting elasticsearch deployer ...`);
		let env = ((process.env.SOAJS_ENV) ? process.env.SOAJS_ENV.toLowerCase() : 'dev');

		if (options.config &&
			options.config.setup &&
			options.config.setup[env] &&
			options.config.setup[env].elasticsearch &&
			options.config.setup[env].elasticsearch.config &&
			options.config.setup[env].elasticsearch.config.path) {

			let configPath = path.join(options.paths.configRepo.path, options.config.setup[env].elasticsearch.config.path);
			//check that the config folder exists and is reachable
			fs.access(configPath, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
				if (error) {
					log('Custom elasticsearch config detected but is not reachable ...');
					throw new Error(error);
				}

				//set a flag to indicate that custom config exists
				options.elasticsearch.customConfig = true;
				//build default config that will be later overwritten by any custom files
				return elasticsearch.getDefaultConf(options, cb);
			});
		}
		else {
			//set a flag to indicate that custom config does not exist
			options.elasticsearch.customConfig = false;
			//build default config based on available templates
			return elasticsearch.getDefaultConf(options, cb);
		}
	},

	/**
	 * Function that sets default elasticsearch conf and yml files based on available templates
	 * @param  {Object}   options An object that contains params passed to the function
	 * @param  {Function} cb      Callback function
	 *
	 */
	getDefaultConf(options, cb) {
		log('Writing default configuration ...');
		options.source = 'template';
		options.content = 'elasticsearch';
		options.target = options.elasticsearch.configDir;
		utils.import(options, (error) => {
			if (error) throw new Error(error);

			return elasticsearch.getCustomConf(options, cb);
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
		if (options.elasticsearch.customConfig) {
			options.source = 'repo';
			options.content = 'elasticsearch';
			options.type = 'config';
			options.target = options.elasticsearch.configDir;

			log('Writing custom configuration ...');
			utils.import(options, (error) => {
				if (error) throw new Error(error);

				return elasticsearch.run(options, cb);
			});
		}
		else {
			log('No custom configuration found, proceeding ...');
			return elasticsearch.run(options, cb);
		}
	},

	/**
	 * Function that runs a kibana instance
	 * @param  {Object}   options An object that contains params passed to the function
	 * @param  {Function} cb      Callback function
	 *
	 */
	run(options, cb) {
		let configDir = options.elasticsearch.configDir;
		// let configFile = path.join(configDir, 'elasticsearch.yml');

		const elasticsearch = spawn('elasticsearch', [ `-Epath.conf=${configDir}` ], { stdio: 'inherit' });

		elasticsearch.on('data', (data) => {
			console.log(data.toString());
		});

		elasticsearch.on('close', (code) => {
			log(`elasticsearch process exited with code: ${code}`);
			return cb();
		});
		elasticsearch.on('error', (error) => {
			log(`elasticsearch process failed with error: ${error}`);
			return cb(error);
		});
	}

};

module.exports = {
	deploy: elasticsearch.init
};
