'use strict';
var fs = require('fs');

var envs = [
    "SOAJS_MONGO_RSNAME",
    "SOAJS_MONGO_NB",
    "SOAJS_MONGO_USERNAME",
    "SOAJS_MONGO_PASSWORD",
    "SOAJS_GIT_OWNER",
    "SOAJS_GIT_REPO",
    "SOAJS_GIT_BRANCH",
    "SOAJS_GIT_TOKEN"
];

var wstream = fs.createWriteStream('/opt/soajs/FILES/serviceEnvsPersist.sh');
wstream.write("#!/bin/bash\n");
wstream.write("export SOAJS_DEPLOYER_AUTO_PERSIST_SERVICE=1\n");
for (var i = 0; i < envs.length; i++) {
    if (process.env[envs[i]])
        wstream.write("export " + envs[i] + "=" + process.env[envs[i]] + "\n");
}
if (process.env.SOAJS_MONGO_NB) {
    for (var i = 1; i <= process.env.SOAJS_MONGO_NB; i++) {
        if (process.env["SOAJS_MONGO_IP_" + i])
            wstream.write("export SOAJS_MONGO_IP_" + i + "=" + process.env["SOAJS_MONGO_IP_" + i] + "\n");
        if (process.env["SOAJS_MONGO_PORT_" + i])
            wstream.write("export SOAJS_MONGO_PORT_" + i + "=" + process.env["SOAJS_MONGO_PORT_" + i] + "\n");
    }
}
wstream.end();
