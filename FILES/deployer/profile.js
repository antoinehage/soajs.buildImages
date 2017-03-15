'use strict';
var fs = require('fs');

var mongoNb = process.env.SOAJS_MONGO_NB || 1;
mongoNb = parseInt(mongoNb);
var mongoRsName = process.env.SOAJS_MONGO_RSNAME || "rs_soajs";
var mongoPrefix = process.env.SOAJS_MONGO_PREFIX || "";

var profileLocation = process.env.SOAJS_PROFILE_LOC || "/opt/soajs/FILES/profiles/";

var lib = {
	/**
	 * functions that updates the servers array list in the cluster configuration
	 * @param {Object} param
	 * @param {Object} profile
	 * @returns {Object} profile
	 */
	"updateServersList": function(param, profile){
		for (var i = 1; i <= param.count; i++) {
			if (process.env[param.ipEnvName + i]) {
				profile.servers.push({
					"host": process.env[param.ipEnvName + i],
					"port": process.env[param.portEnvName + i] || param.portDefault
				});
			}
			else
				console.log("ERROR: Unable to find environment variable " + param.ipEnvName + i);
		}
		return profile;
	},
	
	/**
	 * function that sets the credentials and authSource value if provided as env variables in the cluster configuration
	 * @param {Object} profile
	 * @returns {Object} profile
	 */
	"updatedCredentials": function(profile){
		if (process.env.SOAJS_MONGO_USERNAME && process.env.SOAJS_MONGO_PASSWORD) {
			profile.credentials ={
				"username": process.env.SOAJS_MONGO_USERNAME,
				"password": process.env.SOAJS_MONGO_PASSWORD
			};
			if (process.env.SOAJS_MONGO_AUTH_DB){
				profile.URLParam.authSource = process.env.SOAJS_MONGO_AUTH_DB;
			}
		}
		return profile;
	},
	
	/**
	 * function that writes a profile file from the generated cluster configuration
	 * @param {Object} param
	 * @param {Object} profile
	 * @param {Function} cb
	 */
	"writeProfile": function(param, profile, cb){
		var profileData = "'use strict';\n";
		profileData += 'module.exports = ' + JSON.stringify(profile, null, 2) + ';';
		fs.writeFile(param.loc + param.profileFileName, profileData, "utf8", cb);
	},
	
	/**
	 * function that generates a single instance profile
	 * @param {Object} param
	 * @param {Function} cb
	 */
    "writeSingle": function (param, cb) {
        console.log("writing single profile @" + param.loc);
        var profile = {
        	"name": "core_provision",
        	"prefix": mongoPrefix,
	        "servers":[],
	        "credentials": null,
	        "URLParam": {
		        "maxPoolSize": 2
	        },
	        "extraParam": {
		        "db": {
			        "bufferMaxEntries": 0
		        },
		        "server": {
			        "poolSize": 2,
			        "socketOptions": {
				        "autoReconnect": true
			        }
		        }
	        }
        };
	
	    /**
	     * add the server's informaition
	     */
	    profile = lib.updateServersList(param, profile);
	    
	    /**
	     * add the credentials information if any
	     */
	    profile = lib.updatedCredentials(profile);
	
	    lib.writeProfile(param, profile, cb);
    },
	
	/**
	 * function that generates a replica set profile
	 * @param {Object} param
	 * @param {Function} cb
	 */
	"writeReplica": function (param, cb) {
        console.log("writing replica profile @" + param.loc);
        
        var profile = {
	        "name": "core_provision",
	        "prefix": mongoPrefix,
	        "servers": [],
	        "credentials": null,
	        "URLParam": {
		        "maxPoolSize": 2,
		        "readPreference": "secondaryPreferred",
		        "replicaSet": param.rsName,
		        "w": "majority",
		        "ha": true
	        },
	        "extraParam": {
		        "db": {
			        "bufferMaxEntries": 0
		        },
		        "replSet": {
			        "ha": true,
			        "poolSize": 2
		        }
	        }
        };
        
	    /**
	     * add the server's informaition
	     */
	    profile = lib.updateServersList(param, profile);
	
	    /**
	     * add the credentials information if any
	     */
	    profile = lib.updatedCredentials(profile);
	
	    lib.writeProfile(param, profile, cb);
    }
};

if (mongoNb === 1) {
    lib.writeSingle({
        "profileFileName": 'profile.js',
        "loc": profileLocation,
        "count": mongoNb,
        "ipEnvName": "SOAJS_MONGO_IP_",
        "portEnvName": "SOAJS_MONGO_PORT_",
        "portDefault": 27017,
        "ssl": process.env.SOAJS_MONGO_SSL || false
    }, function (err) {
    	if(err){
    		throw err;
	    }
        console.log("PROFILE SINGLE DONE.");
    });
} else if (mongoNb > 1) {
    lib.writeReplica({
        "profileFileName": 'profile.js',
        "loc": profileLocation,
        "count": mongoNb,
        "ipEnvName": "SOAJS_MONGO_IP_",
        "portEnvName": "SOAJS_MONGO_PORT_",
        "portDefault": 27017,
        "ssl": process.env.SOAJS_MONGO_SSL || false,
        "rsName": mongoRsName
    }, function (err) {
	    if(err){
		    throw err;
	    }
	    
        console.log("PROFILE REPLICA DONE.");
    });
} else {
    console.log("ERROR: PROFILE CREATION FAILED. Environment variable SOAJS_MONGO_NB must be integer [" + mongoNb + "]");
}
