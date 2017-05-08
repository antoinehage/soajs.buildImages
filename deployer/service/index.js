"use strict";
const util = require('util');
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;

const config = require('../config.js');
const utilsFile = require('../utils.js');
const profileGenerator = require('../profile/index.js');

const gitOwner = process.env.SOAJS_GIT_OWNER;
const gitRepo = process.env.SOAJS_GIT_REPO;
const gitCommit = process.env.SOAJS_GIT_COMMIT;
const gitBranch = process.env.SOAJS_GIT_BRANCH || "master";
const gitToken = process.env.SOAJS_GIT_TOKEN;
const gitDomain = process.env.SOAJS_GIT_DOMAIN || "github.com";
const gitProvider = process.env.SOAJS_GIT_PROVIDER || "github";
const soajsProfile = process.env.SOAJS_PROFILE;
const accDeployment = process.env.SOAJS_DEPLOY_ACC;
const mainFile = process.env.SOAJS_SRV_MAIN || ".";
const serviceMemory = process.env.SOAJS_SRV_MEMORY || null;

const soajsEnv = process.env.SOAJS_ENV || 'dev';
const haName = process.env.SOAJS_HA_NAME || '';

const serviceDirectory = "/opt/soajs/node_modules/";
const soajsDirectory = "/opt/soajs/FILES/soajs";

let utils = {
    /**
     * Checks the existence of environment variables that represent the desired repository name and a valid profile
     * @param cb
     */
    checkEnvVars (cb) {
        //check if GIT variables are present
        if(!gitOwner) {
            throw new Error("Unable to find the git owner name");
        }
        if(!gitRepo){
            throw new Error("Unable to find the git repository name");
        }
        //Check if profile variable exists and that the profile exists
        if(!soajsProfile)
            throw new Error("Provide a path to the profile.");

        return cb(true);
    },

    /**
     * clones repo into a directory
     * @param options
     * @param cb
     */
    cloneRepo(options, cb) {
        //check if the service directory exists
        fs.stat(serviceDirectory + gitRepo + "/", (err,stat) => {
            if(err){
                fs.mkdirSync(serviceDirectory + gitRepo + "/");
            }
            //clone the repo
            options.repo = {
                "git": {
                    "owner": gitOwner,
                    "repo": gitRepo,
                    "branch": gitBranch,
                    "commit": gitCommit,
                    "domain": gitDomain,
                    "token": gitToken,
                    "provider": gitProvider
                }
            };
            options.clonePath = serviceDirectory + gitRepo + "/";
            utilsFile.clone(options, cb);
        });
    },

    /**
     * Clones the SOAJS repo to the service directory
     * @param options
     * @param cb
     */
    accelerateDeployment(options, cb) {
        if(accDeployment){
            util.log("Copying SOAJS to accelerate deployment.");
            fs.stat(soajsDirectory, (error, stat) => {
                if(error){
                    throw new error("Cannot find the SOAJS repository in: " + soajsDirectory);
                }
                else {
                    fs.stat(serviceDirectory + gitRepo + "/node_modules/", (error2, stat2) => {
                        if(error2){
                            //create the node_modules directory in which SOAJS will be copied
                            fs.mkdir(serviceDirectory + gitRepo +"/node_modules/soajs/", (error3, res3) => {
                                //copy the SOAJS repo to the node_modules directory of the service repository
                                fse.copy(soajsDirectory, serviceDirectory + gitRepo + "/node_modules/soajs/", cb);
                            });
                        } else {
                            fse.copy(soajsDirectory, serviceDirectory + gitRepo + "/node_modules/soajs/", cb);
                        }
                        util.log("Copied SOAJS to the " + gitRepo + " repository.");
                    });
                }
            });
        }else {
            return cb();
        }
    },

    /**
     * Installs the service dependecies
     * @param options
     * @param cb
     */
    npmInstall(options, cb) {
        //install the depdendencies
        util.log("Installing the " + gitRepo + " dependencies.");
        const npmInstall = spawn('npm', [ 'install' ], { stdio: 'inherit', cwd: serviceDirectory + gitRepo + "/" });

        npmInstall.on('data', (data) => {
            console.log(data.toString());
        });

        npmInstall.on('close', (code) => {
            if (code === 0) {
                util.log('Successfully Installed the ' + gitRepo + ' dependencies.');
                return cb();
            }
            else {
                throw new Error(`npm install failed, exit code: ${code}`);
            }
        });
        npmInstall.on('error', (error) => {
            util.log ('Error while installing the ' + gitRepo + ' dependencies.');
            return cb(error);
        });
    },

    /**
     * Runs the service
     * @param options
     * @param cb
     */
    runService(options, cb) {
        //run the service
        util.log("Running the " + gitRepo + " service.");

        let servicePath =  path.join(serviceDirectory, gitRepo, '/') + mainFile;
        let runParams = 'node ';

        //if custom memory is allocated to the service, add it to the command.
        if (serviceMemory) {
            runParams += "--max_old_space_size=" + serviceMemory + ' ';
        }

        let repoNameClean = gitRepo.replace(/[\\/\*\?"<>\|,\.-]/g, '_').toLowerCase();
        let haNameClean = haName.toLowerCase();
        let logPath = path.join(config.paths.logging.path, `${soajsEnv}-${repoNameClean}--${haNameClean}--service.log`);

        runParams += servicePath + ` 2>&1 | tee ${logPath}`;

        util.log(`Running ${runParams}`);
        const runService = spawn('bash', [ '-c', runParams ], { stdio: 'inherit' });

        runService.on('data', (data) => {
            console.log(data.toString());
        });

        runService.on('error', (error) => {
            console.log (' Unable to start the ' + gitRepo + ' service.');
            return cb(error);
        });
    }
};



let lib = {
    /**
     * Deploys and runs a service in a container based on user input
     * @param options
     * @param cb
     */
    deployService (options, cb) {
        utils.checkEnvVars((res) => {
            //generate and copy the profile to its final destination
            profileGenerator.getProfile(options, (error, response) => {
                //clone the repository
                utils.cloneRepo(options, (error, repo) => {
                    if(repo) {
                        //Check if accelerate deployment is checked
                        utils.accelerateDeployment(options, (error1, res1) => {
                            //install service dependencies and run the service
                            utils.npmInstall(options, (error2) => {
                                if(error2)
                                    return cb(error2);
                                utils.runService(options, cb);
                            });
                        });
                    }
                });

            });

        });
    }
};

module.exports = lib;
