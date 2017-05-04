'use strict';

const fs = require('fs');
const path = require('path');
const async = require('async');
const log = require('util').log;
const handlebars = require("handlebars");

let importer = {

    /**
     * Function that fetches a config repository for any user defined custom files
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    get(options, cb) {
        log(`Fetching custom ${options.type} files ...`);
        let env = ((process.env.SOAJS_ENV) ? process.env.SOAJS_ENV.toLowerCase() : 'dev');

        // if config repo contains custom files, process them
        if (options.config &&
            options.config.setup &&
            options.config.setup[env] &&
            options.config.setup[env].nginx &&
            options.config.setup[env].nginx[options.type] &&
            options.config.setup[env].nginx[options.type].path) {

            let importPath = path.join(options.paths.configRepo.path, options.config.setup[env].nginx[options.type].path);
            if (options.isDirectory) {
                importPath = path.join(importPath, '/');
            }

            // check access to specified custom folder path
            fs.access(importPath, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
                if (error) {
                    log(`Custom ${options.type} detected but not reachable, skipping ...`);
                    log(`Unable to get custom ${options.type}, make sure the path specified in the config.json file is correct and that the folder/file exists ...`);
                    log(error);
                    return cb();
                }

                options.paths.import = { path: importPath };
                if (options.isDirectory) {
                    // Read the custom directory content
                    fs.readdir(options.paths.import.path, (error, files) => {
                        if (error) {
                            log(`Unable to read the content of ${options.type} directory ${options.paths.import.path}, aborting ...`);
                            log(error);
                            return cb();
                        }

                        options.files = files;
                        return importer.read(options, cb);
                    });
                }
                else {
                    let importPathArr = importPath.split('/');

                    options.paths.import.path = importPathArr.slice(0, importPathArr.length - 1).join('/');
                    options.files = [ importPathArr[importPathArr.length - 1] ];
                    return importer.read(options, cb);
                }
            });
        }
        else {
            // if config repo does not contain custom file, return
            log(`No custom ${options.type} detected, proceeding ...`);
            return cb();
        }
    },

    /**
     * Function that reads custom files from a given directory and passes them to another function to be processed
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    read(options, cb) {
        log(`Processing custom ${options.type} file(s) ...`);

        // read the contents of all custom files and pass them to the 'process' function
        async.map(options.files, (oneFile, callback) => {
            let onePath = path.join (options.paths.import.path, oneFile);
            fs.readFile(onePath, (error, fileData) => {
                if (error) {
                    log(`An error occured while reading ${onePath}, skipping file ...`);
                    log(error);
                    return callback();
                }

                return callback(null, fileData);
            });
        }, (error, importData) => {
            // no error will be returned, errors are only logged and files will be skipped
            options.data = { files: importData };
            return importer.process(options, cb);
        });
    },

    /**
     * Function that processes the contents of custom files, searches for placeholders and replaces them if applicable
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    process(options, cb) {
	    
	    
        // before processing, filter out all files that were not read properly because of an error
        async.filter(options.data.files, (oneEntry, callback) => {
            return callback(null, oneEntry);
        }, (error, importEntries) => {
            // convert each custom file from buffer to utf8 string and split based on space
            async.map(importEntries, (oneImport, callback) => {
                let importData = oneImport.toString('utf8');
                let dataArray = importData.split(' ');

                // go through every entry in array, search for placeholders and replace if applicable
                async.map(dataArray, (oneArrayEntry, callback) => {
                	
                	//compile the incoming file content
                	let template = handlebars.compile(oneArrayEntry);
                	
                	//use the compile version to render the env variables
	                let out = template(process.env);
	                
	                //return the output via callback
	                return callback(null, out);
                	
                    // let matches = oneArrayEntry.match(/{{[^}}]*}}/g);
                    // if (matches && matches.length > 0) {
                    //     for (let i = 0; i < matches.length; i++) {
                    //         let placeholder = matches[i].substring(2, matches[i].length - 2);
                    //         if (process.env[placeholder]) {
                    //             let replacementRegExp = new RegExp(matches[i], 'g');
                    //             oneArrayEntry = oneArrayEntry.replace(replacementRegExp, process.env[placeholder]);
                    //         }
                    //     }
                    // }
                    //
                    // return callback(null, oneArrayEntry);
	                
                }, (error, updatedArrayEntries) => {
                    // no errors will be returned
                    // join the array back to a single string and return
                    return callback(null, updatedArrayEntries.join(' '));
                });
            }, (error, updatedFiles) => {
                // no errors will be returned
                options.data.updatedFiles = updatedFiles;
                return importer.write(options, cb);
            });
        });
    },

    /**
     * Function that writes processed custom files to the nginx target directory (or equivalent)
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    write(options, cb) {
        // at this point, all custom files were processed and all placeholders were replaced with equivalent environment variables if applicable
        // write the files to the nginx folder

        async.eachOf(options.data.updatedFiles, (oneFile, index, callback) => {
            let filePath = path.join (options.targetDir, `${options.type}-${index}.conf`);
            // nginx.conf file should preserve file name
            if (options.type === 'conf' && options.data.updatedFiles.length === 1) {
                filePath = path.join (options.targetDir, `nginx.conf`);
            }

            fs.writeFile(filePath, oneFile, (error) => {
                if (error) {
                    log(`An error occured while writing ${filePath}, skipping file ...`);
                    log(error);
                }

                return callback();
            });
        }, (error) => {
            // no errors will be returned, errors while writing files will be logged and the files will be skipped
            log(`Custom ${options.type} files were loaded, DONE`);
            return cb();
        });
    }

};

module.exports = {
    import: importer.get
};
