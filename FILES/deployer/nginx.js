'use strict';
var fs = require('fs');


var controllerNb = process.env.SOAJS_NX_CONTROLLER_NB || 1;
var nxApiDomain = process.env.SOAJS_NX_API_DOMAIN || "api.soajs.org";
var httpsApi = (process.env.SOAJS_NX_API_HTTPS && (process.env.SOAJS_NX_API_HTTPS == 1 ? true : false)) || false;
var httpApiRedirect = (httpsApi && process.env.SOAJS_NX_API_HTTP_REDIRECT && (process.env.SOAJS_NX_API_HTTP_REDIRECT == 1 ? true : false)) || false;

var nxSiteDomain = process.env.SOAJS_NX_SITE_DOMAIN;
var nxSitePath = process.env.SOAJS_NX_SITE_PATH || "/opt/soajs/site";
var httpsSite = (process.env.SOAJS_NX_SITE_HTTPS && (process.env.SOAJS_NX_SITE_HTTPS == 1 ? true : false)) || false;
var httpSiteRedirect = (httpsSite && process.env.SOAJS_NX_SITE_HTTP_REDIRECT && (process.env.SOAJS_NX_SITE_HTTP_REDIRECT == 1 ? true : false)) || false;

var nxOs = process.env.SOAJS_NX_OS || "ubuntu";
var nxLocation = process.env.SOAJS_NX_LOC || "/etc/nginx";

var nxCustomCerts = (process.env.SOAJS_NX_CUSTOM_SSL && (process.env.SOAJS_NX_CUSTOM_SSL == 1 ? true : false)) || false;
var nxCustomCertsLoc = process.env.SOAJS_NX_SSL_CERTS_LOCATION || "/etc/ssl";

var lib = {
    "writeUpstream": function (param, cb) {
        console.log("writing upstream.conf in " + param.loc);
        var wstream = fs.createWriteStream(param.loc + 'upstream.conf');
        wstream.write("upstream " + param.upstreamName + " {\n");
        for (var i = 1; i <= param.count; i++) {
            if (process.env[param.ipEnvName + i])
                wstream.write("  server " + process.env[param.ipEnvName + i] + ":" + param.port + ";\n");
            else
                console.log("ERROR: Unable to find environment variable " + param.ipEnvName + i);
        }
        wstream.write("}\n");
        wstream.end();
        return cb(null);
    },
    "writeStaticLocation": function (param, wstream) {
        wstream.write("  location / {\n");
        wstream.write("    root  " + param.path + ";\n");
        wstream.write("    sendfile       off;\n");
        wstream.write("    index  index.html index.htm;\n");
        wstream.write("  }\n");
    },
    "writeProxyLocation": function (param, wstream) {
        wstream.write("  location / {\n");
        wstream.write("    proxy_pass 		    http://" + param.upstreamName + ";\n");
        wstream.write("    proxy_set_header   	X-Forwarded-Proto 	    $scheme;\n");
        wstream.write("    proxy_set_header   	X-Forwarded-For 	    $remote_addr;\n");
        wstream.write("    proxy_set_header   	Host             		$http_host;\n");
        wstream.write("    proxy_set_header   	X-NginX-Proxy     	    true;\n");
        wstream.write("    proxy_set_header   	Connection        	    \"\";\n");
        wstream.write("  }\n");
    },
    "writeServerRedirect": function (param, wstream) {
        wstream.write("server {\n");
        wstream.write("  listen       " + param.port + ";\n");
        wstream.write("  server_name  " + param.domain + ";\n");
        wstream.write("  client_max_body_size 100m;\n");
        wstream.write("  rewrite ^/(.*) https://" + param.domain + "/$1 permanent;\n");
        wstream.write("}\n");
    },
    "writeServerSSL": function (wstream) {
        var location = nxLocation;
        if (nxCustomCerts) location = nxCustomCertsLoc;

        wstream.write("  ssl_certificate         " + location + "/tls.crt;\n");
        wstream.write("  ssl_certificate_key     " + location + "/tls.key;\n");
        wstream.write("  include " + nxLocation + "/ssl/ssl.conf;\n");
    },
    "writeServer": function (param, wstream) {
        wstream.write("server {\n");
        wstream.write("  listen       " + param.port + ";\n");
        wstream.write("  server_name  " + param.domain + ";\n");
        wstream.write("  client_max_body_size 100m;\n");
        if (param.https)
            lib.writeServerSSL(wstream);
        if (param.location == "proxy")
            lib.writeProxyLocation(param, wstream);
        else if (param.location == "static")
            lib.writeStaticLocation(param, wstream);
        wstream.write("}\n");
    },

    "writeApiConf": function (param, cb) {
        console.log("writing api conf in " + param.loc + " " + param.confFileName);
        var wstream = fs.createWriteStream(param.loc + param.confFileName);

        param.location = "proxy";

        if (httpsApi) {
            if (httpApiRedirect) {
                param.port = "80";
                lib.writeServerRedirect(param, wstream);
            }
            param.https = true;
            param.port = "443 ssl";
            lib.writeServer(param, wstream);
        }
        else if (!httpApiRedirect){
            param.port = "80";
            lib.writeServer(param, wstream);
        }

        wstream.end();
        return cb(null);
    },

    "writeSiteConf": function (param, cb) {
        console.log("writing site conf in " + param.loc + " " + param.confFileName);
        var wstream = fs.createWriteStream(param.loc + param.confFileName);

        param.location = "static";

        if (httpsSite) {
            if (httpSiteRedirect) {
                param.port = "80";
                lib.writeServerRedirect(param, wstream);
            }
            param.https = true;
            param.port = "443 ssl";
            lib.writeServer(param, wstream);
        }
        else if (!httpSiteRedirect){
            param.port = "80";
            lib.writeServer(param, wstream);
        }

        wstream.end();
        return cb(null);
    }
};

lib.writeUpstream({
    "loc": nxLocation + ((nxOs === 'mac') ? "/servers/" : ( nxOs === 'ubuntu') ? "/conf.d/" : "/nginx/"),
    "port": "4000",
    "ipEnvName": "SOAJS_NX_CONTROLLER_IP_",
    "upstreamName": "soajs.controller",
    "count": controllerNb
}, function (err) {
    console.log("NGINX UPSTREAM DONE.");
});

lib.writeApiConf({
    "loc": nxLocation + ((nxOs === 'mac') ? "/servers/" : ( nxOs === 'ubuntu') ? "/sites-enabled/" : "/nginx/"),
    "confFileName": "api.conf",
    "domain": nxApiDomain,
    "upstreamName": "soajs.controller"
}, function (err) {
    console.log("NGINX API CONF DONE.");
});

if (nxSiteDomain) {
    lib.writeSiteConf({
        "loc": nxLocation + ((nxOs === 'mac') ? "/servers/" : ( nxOs === 'ubuntu') ? "/sites-enabled/" : "/nginx/"),
        "confFileName": "site.conf",
        "domain": nxSiteDomain,
        "path": nxSitePath
    }, function (err) {
        console.log("NGINX DASH CONF DONE.");
    });
}
