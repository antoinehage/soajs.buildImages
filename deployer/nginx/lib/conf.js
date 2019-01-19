'use strict';

const fs = require('fs');
const path = require('path');
const async = require('async');
const log = require('util').log;
const config = require('../../config.js');
const utils = require('../../utils');

let builder = {

    /**
     * Function that writes the default upstream.conf file for soajs.controller
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    writeUpstream(options, cb) {
        if(!options.count) {
            log('No upstream entries available for SOAJS controllers, default upstream file won\'t be written');
            return cb();
        }

        log("Writing upstream.conf in " + options.loc);
        let wstream = fs.createWriteStream(options.loc + 'upstream.conf');
        wstream.write("upstream " + options.upstreamName + " {\n");
        for (let i = 1; i <= options.count; i++) {
            if (process.env[options.ipEnvName + i]) {
                wstream.write("  server " + process.env[options.ipEnvName + i] + ":" + options.port + ";\n");
            }
            else {
                log("ERROR: Unable to find environment variable " + options.ipEnvName + i);
            }
        }
        wstream.write("}\n");
        wstream.end();
        return cb(null);
    },

    /**
     * Function that writes nginx config for static location
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Object}   wstream An instance of fs.writeStream
     *
     */
    writeStaticLocation(options, wstream) {
    	let rootPath = options.path;

        wstream.write("  location / {\n");
        wstream.write("    root  " + rootPath + ";\n");
        wstream.write("    sendfile       off;\n");
        wstream.write("    index  index.html index.htm;\n");
        wstream.write("  }\n");
    },

    /**
     * Function that writes nginx config for proxy location
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Object}   wstream An instance of fs.writeStream
     *
     */
    writeProxyLocation(options, wstream) {
        if(!options.count) {
            log('No upstream entries available for SOAJS controllers, proxy location will not be written');
            return;
        }

        wstream.write("  location / {\n");
        wstream.write("    proxy_pass 		    http://" + options.upstreamName + ";\n");
        wstream.write("    proxy_set_header   	X-Forwarded-Proto 	    $scheme;\n");
        wstream.write("    proxy_set_header   	X-Forwarded-For 	    $remote_addr;\n");
        wstream.write("    proxy_set_header   	Host             		$http_host;\n");
        wstream.write("    proxy_set_header   	X-NginX-Proxy     	    true;\n");
        wstream.write("    proxy_set_header   	Connection        	    \"\";\n");
        wstream.write("  }\n");
    },

    /**
     * Function that writes nginx config for server redirect
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Object}   wstream An instance of fs.writeStream
     *
     */
    writeServerRedirect(options, wstream) {
        wstream.write("server {\n");
        wstream.write("  listen       " + options.port + ";\n");
        wstream.write("  server_name  " + options.domain + ";\n");
        wstream.write("  client_max_body_size 100m;\n");
        wstream.write("  rewrite ^/(.*) https://" + options.domain + "/$1 permanent;\n");
        wstream.write("}\n");
    },

    /**
     * Function that writes nginx SSL config
     * @param  {Object}   options An object that contains params passed to the function
     *
     */
    writeServerSSL(wstream) {
        let certsLocation = path.join(config.nginx.location, '/ssl');
        if (config.nginx.config.ssl.customCerts) certsLocation = config.nginx.config.ssl.customCertsPath;

        let tlscrt = certsLocation + "/tls-crt";
        if (!fs.existsSync(tlscrt)) {
            tlscrt = certsLocation + "/tls.crt";
            if (!fs.existsSync(tlscrt)) {
                log('Unable to find SSL CRT file @ location: '+tlscrt)
            }
        }
        let tlskey = certsLocation + "/tls-key";
        if (!fs.existsSync(tlskey)) {
            tlskey = certsLocation + "/tls.key";
            if (!fs.existsSync(tlskey)) {
                log('Unable to find SSL KEY file @ location: '+tlskey)
            }
        }

        wstream.write("  ssl_certificate         " + tlscrt + ";\n");
        wstream.write("  ssl_certificate_key     " + tlskey + ";\n");
        wstream.write("  include " + config.nginx.location + "/ssl/ssl.conf;\n");
    },

    /**
     * Function that writes nginx config for server
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Object}   wstream An instance of fs.writeStream
     *
     */
    writeServer(options, wstream) {
        if (options.location == "proxy" && !options.count) {
            log('No API server entry will be written, SOAJS controller count is missing');
            return;
        }

    	log("writing server entry for", options.domain);
        wstream.write("server {\n");
        wstream.write("  listen       " + options.port + ";\n");
        wstream.write("  server_name  " + options.domain + ";\n");
        wstream.write("  client_max_body_size 100m;\n");
        if (options.https)
            builder.writeServerSSL(wstream);
        if (options.location == "proxy")
            builder.writeProxyLocation(options, wstream);
        else if (options.location == "static")
            builder.writeStaticLocation(options, wstream);
        wstream.write("}\n");
    },

    /**
     * Function that redirects to proper write function for api config based on passed params
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    writeApiConf(options, cb) {
        log("Writing api conf in " + options.loc + " " + options.confFileName);
        let wstream = fs.createWriteStream(options.loc + options.confFileName);
        let httpsApi = config.nginx.config.ssl.httpsApi;
        let httpApiRedirect = config.nginx.config.ssl.httpApiRedirect;

        options.location = "proxy";

        if (httpsApi) {
            if (httpApiRedirect) {
                options.port = "80";
                builder.writeServerRedirect(options, wstream);
            }
            options.https = true;
            options.port = "443 ssl";
            builder.writeServer(options, wstream);
        }
        else if (!httpApiRedirect){
            options.port = "80";
            builder.writeServer(options, wstream);
        }

        wstream.end();
        return cb(null);
    },

    /**
     * Function that redirects to proper write function for site config based on passed params
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    writeSiteConf(options, cb) {
    	let fileLocation = options.loc + options.confFileName;
	    options.domain = process.env.SOAJS_NX_SITE_DOMAIN;
    	//check if dashboard site.conf
	    if (process.env.SOAJS_ENV) {
	    	if(process.env.SOAJS_ENV.toLowerCase() === 'dashboard'){
			    fileLocation = options.loc + "dash.conf";
		    }
		    else if(process.env.SOAJS_ENV.toLowerCase() === 'portal'){
			    fileLocation = options.loc + "portal.conf";
		    }
	    }

        log("Writing site conf in " + fileLocation);
        let wstream = fs.createWriteStream(fileLocation);

        let httpsSite = config.nginx.config.ssl.httpsSite;
        let httpSiteRedirect = config.nginx.config.ssl.httpSiteRedirect;

        options.location = "static";

        if (httpsSite) {
	        if (httpSiteRedirect) {
		        options.port = "80";
		        builder.writeServerRedirect(options, wstream);
	        }
	        options.https = true;
	        options.port = "443 ssl";
	        builder.writeServer(options, wstream);
        }
        else if (!httpSiteRedirect){
	        options.port = "80";
	        builder.writeServer(options, wstream);
        }

        wstream.end();
        setTimeout(function(){
            return cb(null);
        }, 100);
    },

    /**
     * Function that writes the default nginx.conf file from templates and replaces placeholders with appropriate values
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb Callback function
     *
     */
    writeDefaultNginxConf(options, cb) {
        //read nginx.conf from templates directory
        log('Writing default nginx.conf ...');
        options.source = 'template';
        options.content = 'nginx';
        options.type = 'nginx.conf';
        options.target = options.nginx.location;
        utils.import(options, (error) => {
            if (error) throw new Error(error);

            log('nginx.conf written successfully ...');
            return cb();
        });
    },

    /**
     * Function that copies ssl.conf from templates directory to nginx directory
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb Callback function
     *
     */
    copySSLConf(options, cb) {
        //copy ssl.conf from templates directory to nginx directory
        log('Copying ssl.conf ...');
        let readStream = fs.createReadStream(path.join(options.paths.templates.nginx.path, 'ssl.conf'));
        let writeStream = fs.createWriteStream(path.join(options.nginx.location, '/ssl/ssl.conf'));

        readStream.on('error', (error) => {
            log('Unable to read ssl.conf ...');
            throw new Error(error);
        });
        writeStream.on('error', (error) => {
            log('Unable to write ssl.conf ...');
            throw new Error(error);
        });
        writeStream.on('close', () => {
            log('Successfully copied ssl.conf ...');
            return cb();
        });

        readStream.pipe(writeStream);
    },

    /**
     * Function that calls writeUpstream, writeApiConf, and writeSiteConf
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Object}   wstream An instance of fs.writeStream
     *
     */
    write(options, cb) {
        let nxOs = options.nginx.os;
        builder.writeDefaultNginxConf(options, () => {
            builder.copySSLConf(options, () => {
                builder.writeUpstream({
                    loc: options.nginx.location + ((nxOs === 'mac') ? "/servers/" : ( nxOs === 'ubuntu') ? "/conf.d/" : "/nginx/"),
                    port: options.nginx.config.upstream.ctrlPort,
                    ipEnvName: options.nginx.config.upstream.ipEnvName,
                    upstreamName: options.nginx.config.upstream.upstreamName,
                    count: options.nginx.config.upstream.count,
                }, () => {
                    log('SOAJS Controller Upstream was written successfully');
                    builder.writeApiConf({
                        loc: options.nginx.location + ((nxOs === 'mac') ? "/servers/" : ( nxOs === 'ubuntu') ? "/sites-enabled/" : "/nginx/"),
                        confFileName: options.nginx.config.apiConf.fileName,
                        domain: options.nginx.config.apiConf.domain,
                        upstreamName: options.nginx.config.upstream.upstreamName,
                        count: options.nginx.config.upstream.count
                    }, () => {
                        log('Nginx API config was written successfully');
                        if (options.nginx.config.siteConf.domain) {
                            builder.writeSiteConf({
                                loc: options.nginx.location + ((nxOs === 'mac') ? "/servers/" : ( nxOs === 'ubuntu') ? "/sites-enabled/" : "/nginx/"),
                                confFileName: options.nginx.config.siteConf.fileName,
                                domain: options.nginx.config.siteConf.domain,
                                path: options.nginx.config.siteConf.path
                            }, () => {
                                log('Nginx Site config was written successfully');
                                return cb();
                            });
                        }
                        else {
                            return cb();
                        }
                    });
                });
            });
        });
    }

};

module.exports = {
    write: builder.write
};
