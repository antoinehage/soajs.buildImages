'use strict';

const log = require('util').log;
const path = require('path');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;

const utils = require('../utils');

let golang = {

    /**
     * Function that checks for git environment variables and clones repository
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    init(options, cb) {

        if (options.golang && options.golang.git && options.golang.git.domain && options.golang.git.owner && options.golang.git.repo) {

            let repoDirPath = path.join(options.paths.golang.path, options.golang.git.domain, options.golang.git.owner, options.golang.git.repo);
            options.repoDirPath = repoDirPath;

            if (options.step && options.step === 'run')
                return golang.run(options, cb);

            fse.ensureDir(repoDirPath, (error) => {
                if (error) {
                    log(`An error occured while creating ${repoDirPath} ...`);
                    throw new Error(error);
                }

                let cloneOptions = {
                    repo: {
                        git: options.golang.git
                    },
                    clonePath: repoDirPath
                };
                utils.clone(cloneOptions, (error) => {
                    if (error) throw new Error(error);

                    return golang.installDeps(options, cb);
                });
            });
        }
        else {
            log(`Missing required git information, found git owner: [${options.golang.git.owner}], git repo: [${options.golang.git.repo}], exiting ...`);
            return cb();
        }
    },

    /**
     * Function that installs dependencies for a golang service
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    installDeps(options, cb) {
        log('Installing service dependencies ...');
        const get = spawn('go', [ 'get', '-v', './...' ], { stdio: 'inherit', cwd: options.repoDirPath });

        get.on('data', (data) => {
            console.log (data.toString());
        });

        get.on('close', (code) => {
            if (code === 0) {
                log(`go get install process exited with code: ${code}`);
                if (options.step && options.step === 'deploy')
                    return cb();
                else
                    return golang.run(options, cb);
            }
            else {
                throw new Error(`go get install failed, exit code: ${code}`);
            }
        });

        get.on('error', (error) => {
            log('An error occured while installing dependencies');
            throw new Error(error);
        });
    },

    /**
     * Function that runs a golang service
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    run(options, cb) {
        log('Running service ...');

        let runParams = [ options.golang.main ];

        const go = spawn(options.golang.main, [], { stdio: 'inherit', cwd: options.repoDirPath });

        go.on('data', (data) => {
            console.log (data.toString());
        });

        go.on('close', (code) => {
            log(`go process exited with code: ${code}`);
            return cb();
        });

        go.on('error', (error) => {
            log('An error occured while running service');
            throw new Error(error);
        });
    }

};

module.exports = {
    deploy: golang.init
};
