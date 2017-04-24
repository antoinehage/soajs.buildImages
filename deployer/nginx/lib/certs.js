'use strict';

const path = require('path');
const async = require('async');
const openssl = require('openssl-wrapper');

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
                    log('Unable to find nginx SSL dhparam file');
                    log(error);
                    return cb();
                }
                // in case dhparam.pem was not found, generate it
                else if (error && error.code === 'ENOENT') {
                    openssl('dhparam', { outform: 'pem', out: dhparamFilePath, '2048': true }, (error, buffer) => {
                        if (error) {
                            log('Unable to generate nginx SSL dhparam file');
                            log(error);
                            return cb();
                        }

                        console.log (buffer.toString());
                        log('dhparam file generated successfully');
                        return ssl.generate(options, cb);
                    });
                }
                else {
                    return ssl.generate(options, cb);
                }
            });
        }
        else {
            log('SSL dhparam file generation skipped, SSL is not supported for this instance');
            return cb();
        }
    },

    /**
     * Function that generates self signed certificates
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    generate(options, cb) {
        if (!process.env.SOAJS_NX_CUSTOM_SSL || process.env.SOAJS_NX_CUSTOM_SSL !== '1') {
            let crtPath = path.join(options.nginx.location, '/ssl/tls.crt');
            let keyPath = path.join(options.nginx.location, '/ssl/tls.key');
            async.each([crtPath, keyPath], (oneCert, callback) => {
                fs.access(oneCert, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
                    if (error && error.code !== 'ENOENT') {
                        return callback(error);
                    }
                    else if (error && error.code === 'ENOENT') {
                        openssl('req', { x509: true, newKey: true, keyout: onePath, days: '365', nodes: true, subj: `/CN=${config.nginx.masterDomain};` }, (error, buffer) => {
                            if (error) return callback(error);

                            console.log (buffer.toString());
                            log(`${oneCert} generated successfully ...`);
                            return callback();
                        });
                    }
                    else {
                        return callback();
                    }
                });
            }, (error) => {
                if (error) {
                    throw new Error(error);
                }

                return cb();
            });
        }
        else {
            return cb();
        }
    }

};

module.exports = {
    init: ssl.init
}
