'use strict';

const fs = require('fs');
const path = require('path');
const async = require('async');
const log = require('util').log;

let upstream = {

    /**
     * Function that fetches a config repository for any user defined upstream files
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    get(options, cb) {
        log('Fetching custom upstream files ...');
        let env = process.env.SOAJS_ENV.toLowerCase() || 'dev';

        // if config repo contains upstream files, process them
        if (options.config &&
            options.config.setup &&
            options.config.setup[env] &&
            options.config.setup[env].nginx &&
            options.config.setup[env].nginx.upstream &&
            options.config.setup[env].nginx.upstream.path) {

            let upstreamPath = path.join(options.paths.configRepo.path, options.config.setup[env].nginx.upstream.path);
            if (upstreamPath.chatAt(upstreamPath.length - 1) !== '/') upstreamPath += '/';

            // check access to specified upstream folder path
            fs.access(upstreamPath, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
                if (error) {
                    log('Custom upstream detected but not reachable, skipping ...');
                    log('Unable to get custom upstream, make sure the path specified in the config.json file is correct and that the folder exists ...');
                    log(error);
                    return cb();
                }

                options.paths.upstream = { path: upstreamPath };
                return upstream.read(options, cb);
            });
        }
        else {
            // if config repo does not contain custom upstream, return
            log('No custom upstream detected, proceeding ...');
            return cb();
        }
    },

    /**
     * Function that reads upstream files from a given directory and passes them to another function to be processed
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    read(options, cb) {
        log('Processing custom upstream files ...');

        // Read the upstream directory content
        fs.readdir(options.paths.upstream.path, (error, files) => {
            if (error) {
                log('Unable to read the content of upstream directory ' + options.paths.upstream.path + ', aborting ...');
                log(error);
                return cb();
            }

            // read the contents of all upstream files and pass them to the 'process' function
            async.map(files, (oneFile, callback) => {
                let onePath = path.join (options.paths.upstream.path, oneFile);
                fs.readFile(onePath, (error, fileData) => {
                    if (error) {
                        log('An error occured while reading ' + onePath + ', skipping file ...');
                        log(error);
                        return callback();
                    }

                    return callback(fileData);
                });
            }, (error, upstreamData) => {
                // no error will be returned, errors are only logged and files will be skipped
                options.data = { upstreams: upstreamData };
                return upstream.process(options, cb);
            });
        });
    },

    /**
     * Function that processes the contents of upstream files, searches for placeholders and replaces them if applicable
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    process(options, cb) {
        // before processing, filter out all files that were not read properly because of an error
        async.filter(options.data.upstreams, (oneEntry, callback) => {
            return callback(null, oneEntry);
        }, (error, upstreamEntries) => {
            // convert each upstream file from buffer to utf8 string and split based on space
            async.map(upstreamEntries, (oneUpstream, callback) => {
                let upstreamData = oneUpstream.toString('utf8');
                let dataArray = upstreamData.split(' ');

                // go through every entry in array, search for placeholders and replace if applicable
                async.map(dataArray, (oneArrayEntry, callback) => {
                    let matches = oneArrayEntry.match(/{{.*}}/g);
                    if (matches && matches.length > 0) {
                        for (let i = 0; i < matches.length; i++) {
                            let placeholder = matches[i].substring(2, matches[i].length - 2);
                            if (process.env[placeholder]) {
                                let replacementRegExp = new RegExp(matches[i], 'g');
                                oneArrayEntry.replace(replacementRegExp, process.env[placeholder]);
                            }
                        }
                    }

                    return callback(null, oneArrayEntry);
                }, (error, updatedArrayEntries) => {
                    // no errors will be returned
                    // join the array back to a single string and return
                    return callback(null, updatedArrayEntries.join(' '));
                });
            }, (error, updatedUpstream) => {
                // no errors will be returned
                options.data.updatedUpstreams = updatedUpstreams;
                return upstream.write(options, cb);
            });
        });
    },

    /**
     * Function that writes processed upstreams to the nginx conf.d directory (or equivalent)
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    write(options, cb) {
        // at this point, all upstream files were processed and all placeholders were replaced with equivalent environment variables if applicable
        // write the files to the nginx folder

        let nxOs = options.nginx.os;
        let nxUpstreamDir = options.nginx.location + ((nxOs === 'mac') ? "/servers/" : ( nxOs === 'ubuntu') ? "/conf.d/" : "/nginx/");
        async.eachOf(options.data.updatedUpstreams, (oneUpstream, index, callback) => {
            let upstreamFilePath = path.join (nxUpstreamDir, 'upstream-' + index);
            fs.writeFile(upstreamFilePath, (error) => {
                if (error) {
                    log('An error occured while writing ' + upstreamFilePath + ', skipping file ...');
                    log(error);
                }

                return callback();
            });
        }, (error) => {
            // no errors will be returned, errors while writing files will be logged and the files will be skipped
            log('Custom Upstream files were loaded, DONE');
            return cb();
        });
    }

};

module.exports = {
    getUpstream: upstream.get
};
