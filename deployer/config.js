'use strict';

const path = require('path');

module.exports = {

    deploy: {
        types: ['service', 'nginx']
    },

    paths: {
        configRepo: {
            path: __dirname + '/configRepo/'
        },
        tempFolders: {
            temp: {
                path: __dirname + '/temp/'
            },
            tempSite: {
                path: ((process.env.SOAJS_NX_SITE_PATH) ? path.join(process.env.SOAJS_NX_SITE_PATH, '/temp_site') : '/opt/soajs/site/temp_site')
            }
        }
    },

    nginx: {
        os: process.env.SOAJS_NX_OS || 'ubuntu',
        location: process.env.SOAJS_NX_LOC || '/etc/nginx',
        siteLocation: ((process.env.SOAJS_NX_SITE_PATH) ? path.join(process.env.SOAJS_NX_SITE_PATH, '/') : '/opt/soajs/site/')
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
