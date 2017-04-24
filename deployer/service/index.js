"use strict";
const util = require('util');
const fs = require('fs');
const fse = require('fs-extra');
const exec = require('child_process').exec;

const utilsFile = require('../utils.js');
const profileGenerator = require('../profile/index.js');

const gitOwner = process.env.SOAJS_GIT_OWNER;
const gitRepo = process.env.SOAJS_GIT_REPO;
const gitCommit = process.env.SOAJS_GIT_COMMIT;
const gitBranch = process.env.SOAJS_GIT_BRANCH || "master";
const gitToken = process.env.SOAJS_GIT_TOKEN;
const gitDomain = process.env.SOAJS_GIT_DOMAIN || "github.com";
const gitProvider = process.env.SOAJS_GIT_PROVIDER || "Github";
const soajsProfile = process.env.SOAJS_PROFILE;
const accDeployment = process.env.SOAJS_DEPLOY_ACC;

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
     * Installs the service dependecies and runs the service
     * @param options
     * @param cb
     */
    runService(options, cb) {
        //install the depdendencies
        util.log("Installing the " + gitRepo + " dependencies.");
        exec("npm install", {
                cwd: serviceDirectory + gitRepo
            },
            (error1, stdout, stderr) => {
                if(error1){
                    throw new Error("Error while installing the dependencies of repository: " + gitRepo);
                }
                //run the service
                exec("node index.js",{
                    cwd: serviceDirectory + gitRepo + "/"
                }, cb);

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
                        utils.accelerateDeployment(options, (error, res) => {
                            //install service dependencies and run the service
                            utils.runService(options, cb);
                        });
                    }
                });

            });

        });
    }
};

module.exports = lib;