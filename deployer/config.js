'use strict';

module.exports = {

    paths: {
        configRepo: {
            path: __dirname + '/configRepo/'
        }
    },

    nginx: {
        os: process.env.SOAJS_NX_OS || 'ubuntu',
        location: process.env.SOAJS_NX_LOC || '/etc/nginx'
    },

    configRepo: {
        git: {
            provider: process.env.SOAJS_CONFIG_REPO_PROVIDER || 'github',
            domain: process.env.SOAJS_CONFIG_REPO_DOMAIN || ((process.env.SOAJS_CONFIG_REPO_PROVIDER === 'github') ? 'github.com' : (process.env.SOAJS_CONFIG_REPO_PROVIDER === 'bitbucket') ? 'bitbucket.org' : ''),
            owner: process.env.SOAJS_CONFIG_REPO_OWNER || '',
            repo: process.env.SOAJS_CONFIG_REPO_NAME || '',
            branch: process.env.SOAJS_CONFIG_REPO_BRANCH || 'master',
            token: process.env.SOAJS_CONFIG_REPO_TOKEN || ''
        },
        settings: {
            configFileName: 'config.json'
        }
    }

};
