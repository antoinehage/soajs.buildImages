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

        if (options.configRepo.git.owner && options.configRepo.git.repo) {
            if (options.configRepo.git.token) {
                log('Cloning from ' + options.configRepo.git.provider + ' private repository ...');

                if (options.configRepo.git.provider === 'github') {
                    cloneUrl = `https://${options.configRepo.git.token}@${options.configRepo.git.domain}/${options.configRepo.git.owner}/${options.configRepo.git.repo}`;
                }
                else if (options.configRepo.git.provider === 'bitbucket') {
                    if (options.configRepo.git.domain === 'bitbucket.org') {
                        cloneUrl = `https://x-token-auth${options.configRepo.git.token}@${options.configRepo.git.domain}/${options.configRepo.git.owner}/${options.configRepo.git.repo}`;
                    }
                    else {
                        cloneUrl = `https://${options.configRepo.git.token}@${options.configRepo.git.domain}/scm/${options.configRepo.git.owner}/${options.configRepo.git.repo}`;
                    }
                }
            }
            else {
                log('Cloning from ' + options.configRepo.git.provider + ' public repository ...');
                cloneUrl = `https://${options.configRepo.git.domain}/${options.configRepo.git.owner}/${options.configRepo.git.repo}`;
            }

            log('Cloning in progress ...');
            let cloneOptions = {
                checkoutBranch: options.configRepo.git.branch
            };
            git.Clone(cloneUrl, options.clonePath, cloneOptions).then(function (repo) {
                log(`Cloning repository ${options.configRepo.git.owner}/${options.configRepo.git.repo} was successful ...`);
                return cb(null, repo);
            })
            .catch(function (error) {
                log(`Unable to clone repository ${options.configRepo.git.owner}/${options.configRepo.git.repo}`);
                log(error)
                return cb();
            });
        }
        else {
            log('Repository information is missing, skipping ...');
            return cb();
        }
    }

};

module.exports = utils;
