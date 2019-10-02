'use strict';

const log = require('util').log;
const path = require('path');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;

const utils = require('../utils');

let nodejs = {
	
	/**
	 * Function that checks for git environment variables and clones repository
	 * @param  {Object}   options An object that contains params passed to the function
	 * @param  {Function} cb      Callback function
	 *
	 */
	init(options, cb) {
		
		if (options.nodejs && options.nodejs.git && options.nodejs.git.owner && options.nodejs.git.repo) {
			if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
				log('WARNING: Environment variable NODE_ENV is not set to "production". This is not recommended in production environments!');
			}
			let repoDirPath = path.join(options.paths.service.path, options.nodejs.git.repo);
			options.repoDirPath = repoDirPath;
			
			fse.ensureDir(repoDirPath, (error) => {
				if (error) {
					log(`An error occured while creating ${repoDirPath} ...`);
					throw new Error(error);
				}
				
				let cloneOptions = {
					repo: {
						git: options.nodejs.git
					},
					clonePath: repoDirPath
				};
				utils.clone(cloneOptions, (error) => {
					if (error) throw new Error(error);
					return cb();
				});
			});
		}
		else {
			log(`Missing required git information, found git owner: [${options.nodejs.git.owner}], git repo: [${options.nodejs.git.repo}], exiting ...`);
			return cb();
		}
	},
	
	/**
	 * Function that installs dependencies for a nodejs service
	 * @param  {Object}   options An object that contains params passed to the function
	 * @param  {Function} cb      Callback function
	 *
	 */
	installDeps(options, cb) {
		log('Installing service dependencies ...');
		
		if (options.nodejs && options.nodejs.git && options.nodejs.git.owner && options.nodejs.git.repo) {
			if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
				log('WARNING: Environment variable NODE_ENV is not set to "production". This is not recommended in production environments!');
			}
			let repoDirPath = path.join(options.paths.service.path, options.nodejs.git.repo);
			options.repoDirPath = repoDirPath;
			
			const npm = spawn('npm', ['install'], {stdio: 'inherit', cwd: options.repoDirPath});
			
			npm.on('data', (data) => {
				console.log(data.toString());
			});
			
			npm.on('close', (code) => {
				if (code === 0) {
					log(`npm install process exited with code: ${code}`);
					return cb()
					//return nodejs.run(options, cb);
				}
				else {
					throw new Error(`npm install failed, exit code: ${code}`);
				}
			});
			
			npm.on('error', (error) => {
				log('An error occured while installing dependencies');
				throw new Error(error);
			});
		}
		else {
			log(`Missing required git information, found git owner: [${options.nodejs.git.owner}], git repo: [${options.nodejs.git.repo}], exiting ...`);
			return cb();
		}
	},
	
	/**
	 * Function that runs a nodejs service
	 * @param  {Object}   options An object that contains params passed to the function
	 * @param  {Function} cb      Callback function
	 *
	 */
	run(options, cb) {
		log('Running service ...');
		
		if (options.nodejs && options.nodejs.git && options.nodejs.git.owner && options.nodejs.git.repo) {
			if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
				log('WARNING: Environment variable NODE_ENV is not set to "production". This is not recommended in production environments!');
			}
			let repoDirPath = path.join(options.paths.service.path, options.nodejs.git.repo);
			options.repoDirPath = repoDirPath;
			
			
			let serviceRun = options.nodejs.main;
			let nodeParams = ((options.nodejs.memory) ? '--max_old_space_size=' + options.nodejs.memory : '');
			
			let runParams = [];
			if (nodeParams) runParams.push(nodeParams);
			runParams.push(serviceRun);
			
			const node = spawn('node', runParams, {
				stdio: 'inherit',
				cwd: path.join(options.repoDirPath, '/')
			});
			
			node.on('data', (data) => {
				console.log(data.toString());
			});
			
			node.on('close', (code) => {
				log(`node process exited with code: ${code}`);
				return cb();
			});
			
			node.on('error', (error) => {
				log('An error occured while installing dependencies');
				throw new Error(error);
			});
		}
		else {
			log(`Missing required git information, found git owner: [${options.nodejs.git.owner}], git repo: [${options.nodejs.git.repo}], exiting ...`);
			return cb();
		}
	}
	
};

module.exports = {
	deploy: nodejs.init,
	install: nodejs.installDeps,
	run: nodejs.run
};
