/* jshint esversion: 6 */
'use strict';

const spawn = require('child_process').spawn;
const log = require('util').log;

const accelerateClone = process.env.SOAJS_GIT_ACC;

const cloner = {

    /**
     * Function that clones a git repositroy
     * @param  {Object}   options An object that contains params passed to the function
     * @param  {Function} cb      Callback function
     *
     */
    clone(options, cb) {
        let cloneUrl = '';

        if (options.repo.git.owner && options.repo.git.repo) {
            if (!options.repo.git.branch) options.repo.git.branch = 'master';
            if (!options.clonePath) throw new Error(`ERROR: No clone path specified, you need to specify where to download the contents of the repository!`);

            if (options.repo.git.token) {
                log('Cloning from ' + options.repo.git.provider + ' private repository ...');

                if (options.repo.git.provider === 'github') {
                    cloneUrl = `https://${options.repo.git.token}@${options.repo.git.domain}/${options.repo.git.owner}/${options.repo.git.repo}.git`;
                }
                else if (options.repo.git.provider === 'bitbucket') {
                    if (options.repo.git.domain === 'bitbucket.org') {
                        cloneUrl = `https://x-token-auth:${options.repo.git.token}@${options.repo.git.domain}/${options.repo.git.owner}/${options.repo.git.repo}.git`;
                    }
                    else {
                        cloneUrl = `https://${options.repo.git.token}@${options.repo.git.domain}/scm/${options.repo.git.owner}/${options.repo.git.repo}.git`;
                    }
                }
            }
            else {
                log('Cloning from ' + options.repo.git.provider + ' public repository ...');
                cloneUrl = `https://${options.repo.git.domain}/${options.repo.git.owner}/${options.repo.git.repo}.git`;
            }

            log(`Cloning ${options.repo.git.owner}/${options.repo.git.repo} from ${options.repo.git.branch} branch, in progress ...`);

            let gitCommands = [ 'clone', '--progress', '--branch', options.repo.git.branch ];
            if(accelerateClone) {
                gitCommands = gitCommands.concat([ '--depth', '1' ]);
            }
            gitCommands = gitCommands.concat([ cloneUrl, options.clonePath ]);

            const clone = spawn('git', gitCommands, { stdio: 'inherit' });

            clone.on('data', (data) => {
                console.log(data.toString());
            });

            clone.on('close', (code) => {
                if (code === 0) {
                    log(`Cloning repository ${options.repo.git.owner}/${options.repo.git.repo} was successful, exit code: ${code}`);

                    if(!accelerateClone && options.repo.git.commit && options.repo.git.commit!==''){
                    	log(`Detected custom commit provided, switching head to commit ${options.repo.git.commit}`);
                    	let commit = spawn("git", [ 'reset', '--hard', options.repo.git.commit ], {stdio: 'inherit', cwd: options.clonePath });
                    	commit.on('data', (data) => {
                    		log(data.toString());
	                    });

                    	commit.on('error', (error) => {
                    		log(`Switching HEAD to commit ${options.repo.git.commit} Failed`);
                    		throw new Error(error);
	                    });

                    	commit.on('close', function(code){
                    		if(code === 0){
			                    log(`Repository HEAD switched to commit ${options.repo.git.commit}`);
			                    return cb(null, true);
		                    }
                    		else{
			                    throw new Error(`ERROR: Switch HEAD to commit exited with code: ${code}, check clone logs`);
		                    }
	                    });
                    }
                    else{
                        return cb(null, true);
                    }
                }
                else {
                    throw new Error(`ERROR: Clone exited with code: ${code}, check clone logs`);
                }
            });
            clone.on('error', (error) => {
                console.log (`Clone process failed with error: ${error}`);
                throw new Error(error);
            });
        }
        else {
            log('Repository information is missing, skipping ...');
            return cb();
        }
    }

};

module.exports = {
    clone: cloner.clone
};
