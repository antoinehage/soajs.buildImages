'use strict';
var fs = require('fs');

var envs = [
    "SOAJS_NX_CONTROLLER_NB",
    "SOAJS_NX_API_DOMAIN",
    "SOAJS_NX_API_HTTPS",
    "SOAJS_NX_API_HTTP_REDIRECT",
    "SOAJS_NX_SITE_DOMAIN",
    "SOAJS_NX_SITE_PATH",
    "SOAJS_NX_SITE_HTTPS",
    "SOAJS_NX_SITE_HTTP_REDIRECT",
    "SOAJS_NX_OS",
    "SOAJS_GIT_OWNER",
    "SOAJS_GIT_REPO",
    "SOAJS_GIT_BRANCH",
    "SOAJS_GIT_TOKEN",
    "SOAJS_GIT_DASHBOARD_BRANCH"
];

var wstream = fs.createWriteStream('/opt/soajs/FILES/nginxEnvsPersist.sh');
wstream.write("#!/bin/bash\n");
wstream.write("export SOAJS_DEPLOYER_AUTO_PERSIST_NX=1\n");
for (var i = 0; i < envs.length; i++) {
    if (process.env[envs[i]])
        wstream.write("export " + envs[i] + "=" + process.env[envs[i]] + "\n");
    if (process.env.SOAJS_NX_CONTROLLER_NB) {
        if (process.env["SOAJS_NX_CONTROLLER_IP_" + i])
            wstream.write("export SOAJS_NX_CONTROLLER_IP_" + i + "=" + process.env["SOAJS_NX_CONTROLLER_IP_" + i] + "\n");
    }
}
wstream.end();
