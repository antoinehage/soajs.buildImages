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
	updateCustomDomainAndKey(function(){
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
        if (process.env.SOAJS_ENV && process.env.SOAJS_ENV.toLowerCase() !== 'dashboard') return cb();
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
            path: process.env.SOAJS_GIT_PATH || '/',
            token: process.env.SOAJS_GIT_TOKEN || null
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
                branch: gitInfo.branch,
	            token: gitInfo.token
            }
        },
        clonePath: config.paths.tempFolders.temp.path
    };

    log(`Cloning ${gitInfo.owner}/${gitInfo.repo} ...`);
    utils.clone(cloneOptions, (error) => {
        if (error) throw new Error(error);

        let source = path.join(config.paths.tempFolders.temp.path, gitInfo.path || '/');
        let destination = path.join (config.nginx.siteLocation, '/');
        fse.copy(source, destination, { overwrite: true }, (error) => {
            if (error) {
                log(`Unable to move contents of ${gitInfo.owner}/${gitInfo.repo} to ${destination} ...`);
                throw new Error(error);
            }

            // delete contents of temp before cloning a new repository into it
            fse.remove(config.paths.tempFolders.temp.path, (error) => {
                if (error) throw new Error(error);

                log(`${gitInfo.owner}/${gitInfo.repo} cloned successfully ...`);
                return setTimeout(cb, 100);
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
	//check if this nginx should deploy dashboard ui
	if(!process.env.SOAJS_GIT_DASHBOARD_BRANCH || process.env.SOAJS_GIT_DASHBOARD_BRANCH === ''){
		return cb();
	}
	
	//check if extkey1 is provided
	if(!process.env.SOAJS_EXTKEY || process.env.SOAJS_EXTKEY === ''){
		return cb();
	}
	
	let customSettings = {
		api: process.env.API_PREFIX,
		key: process.env.SOAJS_EXTKEY
	};
	customSettings = "var customSettings = " + JSON.stringify(customSettings, null, 2) + ";";
	
	let fileLocation = path.join (config.nginx.siteLocation, '/');
	fs.writeFile(fileLocation + "settings.js", customSettings, {'encoding': 'utf8'}, function(error){
		if(error){
			log("Error:", error);
		}
		return cb();
	});
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
