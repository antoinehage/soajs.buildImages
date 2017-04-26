'use strict';

const path = require('path');
const fs = require('fs');
const log = require('util').log;
const async = require('async');
const openssl = require('openssl-wrapper').exec;

let ssl = {

    /**
     * Function that generates dhparam file if not found
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    init(options, cb) {
        if (process.env.SOAJS_NX_API_HTTPS || process.env.SOAJS_NX_SITE_HTTPS) {
            let dhparamFilePath = path.join(options.nginx.location, '/ssl/dhparam2048.pem');
            fs.access(dhparamFilePath, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
                if (error && error.code !== 'ENOENT') {
                    log('Error occured while checking for nginx SSL dhparam file');
                    log(error);
                    return cb();
                }
                // in case dhparam.pem was not found, generate it
                else if (error && error.code === 'ENOENT') {
                    log('Generating dhparam2048.pem file, please wait ...');
                    openssl('dhparam', { outform: 'pem', out: dhparamFilePath, '2048': false }, (error, buffer) => {
                        if (error) {
                            log('Unable to generate nginx SSL dhparam file');
                            log(error);
                            return cb();
                        }

                        console.log (buffer.toString());
                        log('dhparam file generated successfully');
                        return ssl.check(options, cb);
                    });
                }
                else {
                    return ssl.check(options, cb);
                }
            });
        }
        else {
            log('SSL dhparam file generation skipped, SSL is not supported for this instance');
            return cb();
        }
    },

    /**
     * Function that checks for certificates provided in a configuration repository or volume
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    check(options, cb) {
        // Case 1: user provided certs in a volume, verify that required certs are found
        if (options.nginx.config.ssl.customCerts) {
            log('Detected user-provided certificates via voluming, checking certificates ...');
            let certsVolumePath = options.nginx.config.ssl.customCertsPath;
            let crtPath = path.join(certsVolumePath, '/tls.crt');
            let keyPath = path.join(certsVolumePath, '/tls.key');
            options.certs = [ crtPath, keyPath ];
            ssl.detect(options, (error) => {
                if (error) throw new Error(error);

                log('Certificates found, proceeding ...');
                return cb();
            });
        }
        else {
            // Case 2: user provided certs in config repo
            log('Searching for SSL certificates in configuration repository ...');
            let env = ((process.env.SOAJS_ENV) ? process.env.SOAJS_ENV.toLowerCase() : 'dev');
            if (options.config &&
                options.config.setup &&
                options.config.setup[env] &&
                options.config.setup[env].nginx &&
                options.config.setup[env].nginx.ssl &&
                options.config.setup[env].nginx.ssl.path
            ) {
                log('Detected user-provided certificates via config repository, checking certificates ...');
                let certsRepoPath = path.join(options.paths.configRepo.path, options.config.setup[env].nginx.ssl.path);
                let crtPath = path.join(certsRepoPath, '/tls.crt');
                let keyPath = path.join(certsRepoPath, '/tls.key');
                options.certs = [ crtPath, keyPath ];
                ssl.detect(options, (error) => {
                    if (error) throw new Error(error);

                    log('Certificates found, coping ...');
                    return ssl.copy(options, cb);
                });
            }
            // Case 3: no volume or config repo, generate self signed certificates
            else {
                log('SSL is turned on but no user-provided certificates were found, generating self-signed certificates ...');
                return ssl.generate(options, cb);
            }
        }
    },

    /**
     * Function that detects if a set of certificates is found
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    detect(options, cb) {
        async.each(options.certs, (oneCert, callback) => {
            fs.access(oneCert, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
                if (error) {
                    if (error.code === 'ENOENT') {
                        log(`Error: ${error.code} Certificate ${oneCert} no found`);
                    }
                    else {
                        log(`An error occured while checking ${oneCert}`);
                    }
                    return callback(error);
                }

                return callback();
            });
        }, cb);
    },

    /**
     * Function that generates self signed certificates (overwrites old ones if any)
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    generate(options, cb) {
        if (!options.nginx.config.ssl.customCerts || options.nginx.config.ssl.customCerts !== '1') {
            let crtPath = path.join(options.nginx.location, '/ssl/tls.crt');
            let keyPath = path.join(options.nginx.location, '/ssl/tls.key');
            openssl('req', { x509: true, newkey: 'rsa:4096', keyout: keyPath, out: crtPath, days: '365', nodes: true, subj: `/CN=${options.nginx.masterDomain};` }, (error, buffer) => {
                if (error) throw new Error(error);

                console.log (buffer.toString());
                log(`Certificates generated successfully ...`);
                return cb();
            });
        }
        else {
            return cb();
        }
    },

    /**
     * Function that copies certificates from config repository to /etc/nginx/ssl directory
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    copy(options, cb) {
        let destination = path.join(options.nginx.location, '/ssl');
        async.each(options.certs, (oneCertPath, callback) => {
            let readStream = fs.createReadStream(oneCertPath);
            let writeStream = fs.createWriteStream(path.join(destination, oneCertPath.substring(oneCertPath.lastIndexOf('/'))));

            readStream.on('error', (error) => {
                log(`Unable to read ${oneCertPath} ...`);
                return callback(error);
            });
            writeStream.on('error', (error) => {
                log(`Unable to write ${oneCertPath} to ${destination} ...`);
                return callback(error);
            });
            writeStream.on('close', () => {
                return callback();
            });

            readStream.pipe(writeStream);
        }, (error) => {
            if (error) {
                log(error);
                throw new Error(error);
            }

            log(`Successfully copied certificates to ${destination} ...`);
            return cb();
        });

    }

};

module.exports = {
    init: ssl.init
}
