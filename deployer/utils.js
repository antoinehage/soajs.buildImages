'use strict';

const git = require('nodegit');
const log = require('util').log;

let utils = {

    /**
     * Function that clones a git repositroy
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    clone(options, cb) {
        let cloneUrl = '';

        if (options.repo.git.owner && options.repo.git.repo) {
            if (options.repo.git.token) {
                log('Cloning from ' + options.repo.git.provider + ' private repository ...');

                if (options.repo.git.provider === 'github') {
                    cloneUrl = `https://${options.repo.git.token}@${options.repo.git.domain}/${options.repo.git.owner}/${options.repo.git.repo}`;
                }
                else if (options.repo.git.provider === 'bitbucket') {
                    if (options.repo.git.domain === 'bitbucket.org') {
                        cloneUrl = `https://x-token-auth${options.repo.git.token}@${options.repo.git.domain}/${options.repo.git.owner}/${options.repo.git.repo}`;
                    }
                    else {
                        cloneUrl = `https://${options.repo.git.token}@${options.repo.git.domain}/scm/${options.repo.git.owner}/${options.repo.git.repo}`;
                    }
                }
            }
            else {
                log('Cloning from ' + options.repo.git.provider + ' public repository ...');
                cloneUrl = `https://${options.repo.git.domain}/${options.repo.git.owner}/${options.repo.git.repo}`;
            }

            log('Cloning in progress ...');
            let cloneOptions = {
                checkoutBranch: options.repo.git.branch
            };
            git.Clone(cloneUrl, options.clonePath, cloneOptions).then(function (repo) {
                log(`Cloning repository ${options.repo.git.owner}/${options.repo.git.repo} was successful ...`);
                return cb(null, repo);
            })
            .catch(function (error) {
                if (error) {
                    log(`Unable to clone repository ${options.repo.git.owner}/${options.repo.git.repo}`);
                    throw new Error(error);
                }
            });
        }
        else {
            log('Repository information is missing, skipping ...');
            return cb();
        }
    }

};

module.exports = utils;
