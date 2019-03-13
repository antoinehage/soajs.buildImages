"use strict";
const fs = require('fs');
const util = require('util');

var mongoNbTemp = process.env.SOAJS_MONGO_NB || 1;
const mongoNb = parseInt(mongoNbTemp);
const mongoRsName = process.env.SOAJS_MONGO_RSNAME;
const mongoPrefix = process.env.SOAJS_MONGO_PREFIX || "";
const mongoProfileFolder = __dirname + "/driver/";

const profileLocation = process.env.SOAJS_PROFILE_LOC || "/opt/soajs/FILES/profiles/";

let helperFunctions = {
    /**
     * clones a JSON object
     * @param obj
     * @returns {*}
     */
    cloneObj (obj) {
        if (typeof obj !== "object" || obj === null) {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof RegExp) {
            return new RegExp(obj);
        }

        if (obj instanceof Array && Object.keys(obj).every(function (k) {
                return !isNaN(k);
            })) {
            return obj.slice(0);
        }
        var _obj = {};
        for (var attr in obj) {
            if (Object.hasOwnProperty.call(obj, attr)) {
                _obj[attr] = helperFunctions.cloneObj(obj[attr]);
            }
        }
        return _obj;
    },

    /**
     * functions that updates the servers array list in the cluster configuration
     * @param {Object} param
     * @param {Object} profile
     * @returns {Object} profile
     */
    updateServersList(param, profile){
        for (var i = 1; i <= param.count; i++) {
            if (process.env[param.ipEnvName + i]) {
                let port = process.env[param.portEnvName + i] || param.portDefault;
                port = parseInt(port);
                if (isNaN(port)){
                    throw new Error("ERROR: Profile PORT must be integer: " + process.env[param.portEnvName + i]);
                }
                else {
                    profile.servers.push({
                        "host": process.env[param.ipEnvName + i],
                        "port": port
                    });
                }
            }
            else {
                throw new Error("ERROR: Unable to find environment variable " + param.ipEnvName + i);
            }
        }
        return profile;
    },

    /**
     * function that sets the credentials and authSource value if provided as env variables in the cluster configuration
     * @param {Object} profile
     * @returns {Object} profile
     */
    updateCredentials (profile){
        if (process.env.SOAJS_MONGO_USERNAME && process.env.SOAJS_MONGO_PASSWORD) {
            profile.credentials ={
                "username": process.env.SOAJS_MONGO_USERNAME,
                "password": process.env.SOAJS_MONGO_PASSWORD
            };
            if (process.env.SOAJS_MONGO_AUTH_DB){
                profile.URLParam.authSource = process.env.SOAJS_MONGO_AUTH_DB;
            } else {
                profile.URLParam.authSource = "admin";
            }
        }
        return profile;
    },
};

let utils = {
    /**
     * function that writes a profile file from the generated cluster configuration
     * @param {Object} param
     * @param {Object} profile
     * @param {Function} cb
     */
    writeProfile (param, profile, cb){
        let profileData = "'use strict';\n";
        profileData += 'module.exports = ' + JSON.stringify(profile, null, 2) + ';';
        fs.writeFile(param.loc + param.profileFileName, profileData, "utf8", cb);
    },

    /**
     * function that generates a single instance profile
     * @param {Object} param
     * @param {Function} cb
     */
    generateProfile (param, cb) {
        let requiredFile = require(mongoProfileFolder + param.driver);
        let profile = helperFunctions.cloneObj(requiredFile);

        profile.prefix = mongoPrefix;

        if(param.driver === "replica.js" && param.rsName)
            profile.URLParam.replicaSet = param.rsName;
        
        if(param.ssl){
        	profile.URLParam.ssl = (param.ssl === "true");
        }

        //add the servers' informaition
        profile = helperFunctions.updateServersList(param, profile);
        //add the credentials information if any
        profile = helperFunctions.updateCredentials(profile);
        //Copy the profile to the designated destination
        utils.writeProfile(param, profile, cb);
    }
};

let lib = {
    /**
     * Creates (or copies) a profile based on available environment variables and deploys it in a specified directory
     * inside the container
     * @param options
     * @param cb
     */
    getProfile (options, cb) {
        //Check if a custom repo exists and contains a custom profile path
        if(options && options.config && options.config.setup && options.config.setup[process.env.SOAJS_ENV]
            && options.config.setup[process.env.SOAJS_ENV].service && options.config.setup[process.env.SOAJS_ENV].service.profile
            && options.config.setup[process.env.SOAJS_ENV].service.profile.path){

            let profilePath = options.paths.configRepo.path + options.config.setup[process.env.SOAJS_ENV].service.profile.path;
            //Copy the custom profile to the destined profile location

            fs.readFile(profilePath, 'utf8', (error, customProfile) => {
                if(error) {
                    util.log(error);
                    throw new Error("Could not access the following custom profile: " + profilePath);
                } else {
                    fs.writeFile(profileLocation + "profile.js", customProfile, (error1) => {
                       if(error1){
                           util.log(error1)
                           throw new Error("Error while copying the custom profile to: " + profileLocation);
                       }
                       util.log("Successfully copied the custom profile from " + profilePath + " to " + profileLocation);
                       return cb(null, true);
                    });
                }
            });
        }
        //Generate a new profile based on available environment variables
        else {
            //Single instance mongo
            if (mongoNb === 1) {
                util.log("Generating a profile for a single mongo instance.");
                utils.generateProfile({
                    "driver": "single.js",
                    "profileFileName": 'profile.js',
                    "loc": profileLocation,
                    "count": mongoNb,
                    "ipEnvName": "SOAJS_MONGO_IP_",
                    "portEnvName": "SOAJS_MONGO_PORT_",
                    "portDefault": 27017,
                    "ssl": process.env.SOAJS_MONGO_SSL || false
                }, (err) => {
                    if(err){
                        throw new Error(err);
                    }
                    util.log("Successfully generated a profile for a single mongo instance.");
                    return cb(null, true);
                });
            } else if (mongoNb > 1 && mongoRsName) {
                util.log("Generating a profile for a mongo replica set.");
                utils.generateProfile({
                    "driver": "replica.js",
                    "profileFileName": 'profile.js',
                    "loc": profileLocation,
                    "count": mongoNb,
                    "ipEnvName": "SOAJS_MONGO_IP_",
                    "portEnvName": "SOAJS_MONGO_PORT_",
                    "portDefault": 27017,
                    "ssl": process.env.SOAJS_MONGO_SSL || false,
                    "rsName": mongoRsName
                }, (err) => {
                    if(err){
                        throw new Error(err);
                    }
                    util.log("Successfully generated a profile for a mongo replica set.");
                    return cb(null, true);
                });
            } else if (mongoNb > 1 && !mongoRsName) {
                util.log("Generating a profile for a mongo sharded cluster.");
                utils.generateProfile({
                    "driver": "mongos.js",
                    "profileFileName": 'profile.js',
                    "loc": profileLocation,
                    "count": mongoNb,
                    "ipEnvName": "SOAJS_MONGO_IP_",
                    "portEnvName": "SOAJS_MONGO_PORT_",
                    "portDefault": 27017,
                    "ssl": process.env.SOAJS_MONGO_SSL || false,
                }, (err) => {
                    if(err){
                        throw new Error(err);
                    }
                    util.log("Successfully generated a profile for a mongo sharded cluster.");
                    return cb(null, true);
                });
            }

            else {
                throw new Error("ERROR: PROFILE CREATION FAILED. Environment variable SOAJS_MONGO_NB must be a strict positive integer (greater than 0). [" + mongoNb + "] is invalid.");
            }
        }
    }
};

module.exports = lib;