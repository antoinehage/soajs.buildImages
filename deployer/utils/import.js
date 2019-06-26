/* jshint esversion: 6 */
'use strict';

const fs = require('fs');
const path = require('path');
const async = require('async');
const log = require('util').log;
const handlebars = require("handlebars");

handlebars.registerHelper('for', function(from, to, incr, block) {
    var accum = '';

    for(var i = from; i < to; i += incr) {
        accum += block.fn(i);
    }

    return accum;
});

handlebars.registerHelper('inc', function(value, options) {
    return parseInt(value) + 1;
});

handlebars.registerHelper('concat', function(str1, str2) {
    return str1 + str2;
});

handlebars.registerHelper('equals', function(str1, str2) {
    return (str1 === str2);
});

handlebars.registerHelper('env', function (env) {
    return process.env[env];
});

handlebars.registerHelper('lessthan', function (index, length) {
    return (index < length);
});

/**
 * Input:
 *  options.
 *      source: source of the files, can be 'template' or 'repo'
 *      content: type of the files being imported [nginx | logstash | etc...]
 *      type: sub-type as defined in the config repo json file, depends on content
 *      target: target directory where files should be written after being processed
 */

const importer = {

    /**
     * Function that fetches a config repository for any user defined custom files
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    get(options, cb) {
        log(`Fetching ${options.content} files ...`);
        let env = ((process.env.SOAJS_ENV) ? process.env.SOAJS_ENV.toLowerCase() : 'dev');
        options.import = {};

        if (options.source === 'template') {
            // template path is guaranteed to exist, use it
            options.import.path = options.paths.templates[options.content].path;
            // if options.type is set, add the file/folder set as value to the import path
            // if only one file or directory needs to be imported, set its name in options.type
            if (options.type) {
                options.import.path = path.join(options.import.path, options.type);
            }
            else {
                options.type = '';
            }
        }
        else if (options.source === 'repo') {
            // check if config repo contains the target path and use it
            if (options.config &&
                options.config.setup &&
                options.config.setup[env] &&
                options.config.setup[env][options.content] &&
                options.config.setup[env][options.content][options.type] &&
                options.config.setup[env][options.content][options.type].path) {

                options.import.path = path.join(options.paths.configRepo.path, options.config.setup[env][options.content][options.type].path);
            }
        }

        log (options);
        // if config repo contains custom files, process them
        if (options.import.path) {
            // check access to specified custom file/directory path
            fs.access(options.import.path, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (error) => {
                if (error) {
                    log(`${options.content}/${options.type} detected but not reachable ...`);
                    log(`Unable to get ${options.content}, make sure the path specified in the config.json file is correct and that the folder/file exists ...`);
                    throw new Error(error);
                }

                // detect whether import path points to a file or directory
                fs.stat(options.import.path, (error, stats) => {
                    if (error) {
                        log(`${options.content}/${options.type} detected but not reachable ...`);
                        log(`Unable to get ${options.content}, make sure the path specified in the config.json file is correct and that the folder/file exists ...`);
                        throw new Error(error);
                    }

                    options.import.isDirectory = stats.isDirectory();
                    options.import.files = [];

                    // build a list that contains the file name or folder contents
                    if (options.import.isDirectory)  {
                        // read directory contents and push them to files array
                        options.import.path = path.join(options.import.path, '/');
                        fs.readdir(options.import.path, (error, files) => {
                            if (error) {
                                log(`Unable to read the content of ${options.content}/${options.type} directory ${options.import.path}, aborting ...`);
                                throw new Error(error);
                            }

                            // forward to read()
                            options.import.files = files;
                            return importer.read(options, cb);
                        });
                    }
                    else {
                        // set options.import.path to the directory that contains the file and push the filename to the files array
                        options.import.files.push(path.basename(options.import.path));
                        options.import.path = path.dirname(options.import.path);
                        // forward to read()
                        return importer.read(options, cb);
                    }
                });
            });
        }
        else {
            log(`No ${options.source} files of type: ${options.content}/${options.type} detected, proceeding ...`);
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
        log(`Reading ${options.content}/${options.type} file(s) ...`);

        // read the contents of all custom files and pass them to the 'process' function
        async.map(options.import.files, (oneFile, callback) => {
            let onePath = path.join (options.import.path, oneFile);

            fs.readFile(onePath, (error, fileData) => {
                if (error) {
                    log(`An error occured while reading ${onePath} ...`);
                    return callback(error);
                }

                return callback(null, { name: oneFile, data: fileData });
            });
        }, (error, importData) => {
            if (error) throw new Error(error);
            // forward to process()
            options.import.data = { files: importData };
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
        log(`Processing ${options.content}/${options.type} file(s) ...`);

        // before processing, filter out empty files if any
        async.filter(options.import.data.files, (oneFile, callback) => {
            return callback(null, oneFile.data);
        }, (error, validFiles) => {
            // render files using handlebars
            async.map(validFiles, (oneValidFile, callback) => {
                let fileData = oneValidFile.data.toString('utf8');
                let fileTmpl = handlebars.compile(fileData);
                let render = fileTmpl(process.env);

                return callback(null, { name: oneValidFile.name, data: render });
            }, (error, renderedFiles) => {
                // forward to write()
                options.import.data = { files: renderedFiles };
                return importer.write(options, cb);
            });
        });
    },

    /**
     * Function that writes processed custom files to the target directory
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    write(options, cb) {
        log(`Writing ${options.content}/${options.type} file(s) ...`);

        async.each(options.import.data.files, (oneFile, callback) => {
            let filePath = path.join(options.target, oneFile.name);
            fs.writeFile(filePath, oneFile.data, (error) => {
                if (error) {
                    log(`An error occured while writing ${filePath}, skipping file ...`);
                    return callback(error);
                }

                return callback();
            });
        }, (error) => {
            if (error) throw new Error(error);

            log(`${options.content}/${options.type} files were loaded successfully, DONE`);
            return cb();
        });
    }

};

module.exports = {
    import: importer.get
};
