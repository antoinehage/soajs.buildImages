/* jshint esversion: 6 */
'use strict';
const fs = require('fs');
const log = require('util').log;
const path = require('path');
const async = require('async');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;

const config = require('../config.js');
const ssl = require('./lib/certs.js');
const conf = require('./lib/conf.js');
const sites = require('./lib/sites.js');
const utils = require('../utils');

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
		log(`Nginx process exited with code: ${code}`);
		return cb();
	});
	nginx.on('error', (error) => {
		log(`Nginx process failed with error: ${error}`);
		return cb(error);
	});
}

/**
 * Function that clones UI of dashboard
 * @param  cb {Function} Callback
 *
 */
function getDashboardUI(cb) {
	if (process.env.SOAJS_ENV && process.env.SOAJS_ENV.toLowerCase() !== 'dashboard') return cb();
	if (!process.env.SOAJS_GIT_DASHBOARD_BRANCH || process.env.SOAJS_GIT_DASHBOARD_BRANCH === '') return cb();
	
	doClone(config.dashboard, (error) => {
		if (error) throw new Error(error);
		return cb(null, true);
	});
}

/**
 * Function that clones UI of portal
 * @param  cb {Function} Callback
 */
function getPortalUI(cb){
	if (process.env.SOAJS_ENV && process.env.SOAJS_ENV.toLowerCase() !== 'portal') return cb();
	if (!process.env.SOAJS_GIT_PORTAL_BRANCH || process.env.SOAJS_GIT_PORTAL_BRANCH === '') return cb();
	
	doClone(config.portal, (error) => {
		if (error) throw new Error(error);
		return cb(null, true);
	});
}

/**
 * Function that clones UI passed as environment variables only (not sites.json config)
 * @param  cb {Function} Callback
 *
 */
function getUI(cb) {
	if (!process.env.SOAJS_GIT_OWNER || !process.env.SOAJS_GIT_REPO) {
		log('No or missing git information for custom UI, no custom UI to clone ...');
		return cb();
	}
	
	let gitInfo = {
		provider: process.env.SOAJS_GIT_PROVIDER || 'github',
		domain: process.env.SOAJS_GIT_DOMAIN || 'github.com',
		owner: process.env.SOAJS_GIT_OWNER,
		repo: process.env.SOAJS_GIT_REPO,
		branch: process.env.SOAJS_GIT_BRANCH || 'master',
		path: process.env.SOAJS_GIT_PATH || '/',
		token: process.env.SOAJS_GIT_TOKEN || null
	};
	
	doClone(gitInfo, (error) => {
		if (error) throw new Error(error);
		return cb(null, true);
	});
}

/**
 * Function that clones the code from a repo to a temporary folder, then moves it to its final destination and cleans up the temp folder
 * @param gitInfo {Object} contains the information of the git repo to clone the code from
 * @param mCb {Function} Callback
 */
function doClone(gitInfo, mCb){
	// clone ui
	let cloneOptions = {
		repo: {
			git: {
				provider: gitInfo.provider,
				domain: gitInfo.domain,
				owner: gitInfo.owner,
				repo: gitInfo.repo,
				branch: gitInfo.branch,
				token: gitInfo.token
			}
		},
		clonePath: config.paths.tempFolders.temp.path
	};
	
	log(`Cloning ${gitInfo.owner}/${gitInfo.repo} ...`);
	utils.clone(cloneOptions, (error) => {
		if (error) return mCb(error);
		
		let source = path.join(config.paths.tempFolders.temp.path, gitInfo.path || '/');
		let destination = path.join (config.nginx.siteLocation, '/');
		fse.copy(source, destination, { overwrite: true }, (error) => {
			if (error) {
				log(`Unable to move contents of ${gitInfo.owner}/${gitInfo.repo} to ${destination} ...`);
				return mCb(error);
			}
			
			// delete contents of temp before cloning a new repository into it
			fse.remove(config.paths.tempFolders.temp.path, (error) => {
				if (error) return mCb(error);
				
				log(`${gitInfo.owner}/${gitInfo.repo} cloned successfully ...`);
				return setTimeout(mCb, 100);
			});
		});
	});
}

/**
 * Function that updates the content of custom.js based on key and api prefix provided
 * @param cb
 * @returns {*}
 */
function updateCustomDomainAndKey(cb){
	//check if this nginx should deploy create a settings file for the ui
	if(!process.env.SOAJS_ENV || ['dashboard', 'portal'].indexOf(process.env.SOAJS_ENV.toLowerCase()) === -1){
		return cb();
	}
	
	if(!process.env.SOAJS_GIT_DASHBOARD_BRANCH && !process.env.SOAJS_GIT_PORTAL_BRANCH){
		return cb();
	}
	
	//check if extkey1 is provided
	if(!process.env.SOAJS_EXTKEY || process.env.SOAJS_EXTKEY === ''){
		return cb();
	}
	
	let customSettings = {
		api: process.env.SOAJS_NX_API_DOMAIN.replace("." + process.env.SOAJS_NX_DOMAIN, ""),
		key: process.env.SOAJS_EXTKEY
	};
	customSettings = "var customSettings = " + JSON.stringify(customSettings, null, 2) + ";";
	
	let fileLocation = path.join (config.nginx.siteLocation, '/');
	fs.writeFile(fileLocation + "settings.js", customSettings, {'encoding': 'utf8'}, (error) =>{
		if(error){
			log("Error:", error);
		}
		return cb(null, true);
	});
}

/**
 * Function that pulls and deploys multiple ui components based on custom repo configuration on top of portal ui
 * @param options
 * @param cb
 */
function getCustomUISites(options, cb){
	sites.getSites(options, cb);
}

const exp = {

    deploy(options, cb) {
        ssl.init(options, () => {
            conf.write(options, () => {
                let nxOs = options.nginx.os;

                options.source = 'repo';
                options.content = 'nginx';
                options.type = 'upstream';
                options.target = options.nginx.location + ((nxOs === 'mac') ? "/servers/" : ( nxOs === 'ubuntu') ? "/conf.d/" : "/nginx/");
                utils.import(options, (error) => {
                    if (error) throw new Error(error);

                    options.source = 'repo';
                    options.content = 'nginx';
                    options.type = 'sites-enabled';
                    options.target = options.nginx.location + ((nxOs === 'mac') ? "/servers/" : ( nxOs === 'ubuntu') ? "/sites-enabled/" : "/nginx/");
                    utils.import(options, (error) => {
                        if (error) throw new Error(error);

                        options.source = 'repo';
                        options.content = 'nginx';
                        options.type = 'nginx.conf';
                        options.target = options.nginx.location;
                        utils.import(options, (error) => {
                            if (error) throw new Error(error);

                            // Get dashboard UI if dashboard nginx, check for validity is done in the getUI() function
                            getDashboardUI(() => {
	
	                            // Get portal UI if portal nginx, check for validity is done in the getUI() function
                            	getPortalUI(() => {
		
		                            //Get custom UI module if user specified source as environment variables (this is not related to sites.json config)
		                            getUI(() => {
			
			                            // Get custom UI sites if any
			                            getCustomUISites(options, () => {
				
				                            //update settings.js for both portal and dash interfaces
				                            updateCustomDomainAndKey(() =>{
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
            });
        });
    }

};

module.exports = exp;
