'use strict';
var fs = require('fs');

var mongoNb = process.env.SOAJS_MONGO_NB || 1;
mongoNb = parseInt(mongoNb);
var mongoRsName = process.env.SOAJS_MONGO_RSNAME || "rs_soajs";
var mongoPrefix = process.env.SOAJS_MONGO_PREFIX || "";

var profileLocation = process.env.SOAJS_PROFILE_LOC || "/opt/soajs/FILES/profiles/";


var lib = {
    "writeSingle": function (param, cb) {
        console.log("writing single profile @" + param.loc);
        var wstream = fs.createWriteStream(param.loc + param.profileFileName);

        wstream.write('\'use strict\';\n');
        wstream.write('module.exports = {\n');
        wstream.write('    "name": "core_provision",\n');
        wstream.write('    "prefix": "' + mongoPrefix + '",\n');
        wstream.write('    "servers": [\n');

        for (var i = 1; i <= param.count; i++) {
            if (process.env[param.ipEnvName + i]) {
                wstream.write('        {\n');
                wstream.write('                 "host": "' + process.env[param.ipEnvName + i] + '",\n');
                wstream.write('                 "port": ' + (process.env[param.portEnvName + i] || param.portDefault) + '\n');
                if (i === param.count)
                    wstream.write('        }\n');
                else
                    wstream.write('        },\n');
            }
            else
                console.log("ERROR: Unable to find environment variable " + param.ipEnvName + i);
        }

        wstream.write('    ],\n');

        if (process.env.SOAJS_MONGO_USERNAME && process.env.SOAJS_MONGO_PASSWORD) {
            wstream.write('    "credentials": {\n');
            wstream.write('        "username": "' + process.env.SOAJS_MONGO_USERNAME + '",\n');
            wstream.write('        "password": "' + process.env.SOAJS_MONGO_PASSWORD + '"\n');
            wstream.write('    },\n');
        }
        else
            wstream.write('    "credentials": null,\n');

        wstream.write('    "URLParam": {\n');
        wstream.write('        "maxPoolSize": 2\n');
        wstream.write('    },\n');
        wstream.write('    "extraParam": {\n');
        wstream.write('        "db": {\n');
        wstream.write('            "bufferMaxEntries": 0\n');
        wstream.write('       }\n');
        wstream.write('    }\n');
        wstream.write('};\n');

        wstream.end();
        return cb(null);
    },
    "writeReplica": function (param, cb) {
        console.log("writing replica profile @" + param.loc);
        var wstream = fs.createWriteStream(param.loc + param.profileFileName);

        wstream.write('\'use strict\';\n');
        wstream.write('module.exports = {\n');
        wstream.write('    "name": "core_provision",\n');
        wstream.write('    "prefix": "' + mongoPrefix + '",\n');
        wstream.write('    "servers": [\n');

        for (var i = 1; i <= param.count; i++) {
            if (process.env[param.ipEnvName + i]) {
                wstream.write('        {\n');
                wstream.write('                 "host": "' + process.env[param.ipEnvName + i] + '",\n');
                wstream.write('                 "port": ' + (process.env[param.portEnvName + i] || param.portDefault) + '\n');
                if (i === param.count)
                    wstream.write('        }\n');
                else
                    wstream.write('        },\n');
            }
            else
                console.log("ERROR: Unable to find environment variable " + param.ipEnvName + i);
        }

        wstream.write('    ],\n');

        if (process.env.SOAJS_MONGO_USERNAME && process.env.SOAJS_MONGO_PASSWORD) {
            wstream.write('    "credentials": {\n');
            wstream.write('        "username": "' + process.env.SOAJS_MONGO_USERNAME + '",\n');
            wstream.write('        "password": "' + process.env.SOAJS_MONGO_PASSWORD + '"\n');
            wstream.write('    },\n');
        }
        else
            wstream.write('    "credentials": null,\n');

        wstream.write('    "URLParam": {\n');
        wstream.write('        "maxPoolSize": 2,\n');
        wstream.write('        "readPreference": "secondaryPreferred",\n');
        wstream.write('        "replicaSet": "' + param.rsName + '",\n');
        wstream.write('        "w": "majority",\n');
        wstream.write('        "ha": true\n');
        wstream.write('    },\n');
        wstream.write('    "extraParam": {\n');
        wstream.write('        "db": {\n');
        wstream.write('            "bufferMaxEntries": 0\n');
        wstream.write('       },\n');
        wstream.write('       "replSet": {\n');
        wstream.write('            "ha": true\n');
        wstream.write('        }\n');
        wstream.write('    }\n');
        wstream.write('};\n');

        wstream.end();
        return cb(null);
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
        console.log("PROFILE REPLICA DONE.");
    });
} else {
    console.log("ERROR: PROFILE CREATION FAILED. Environment variable SOAJS_MONGO_NB must be integer [" + mongoNb + "]");
}
