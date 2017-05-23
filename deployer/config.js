'use strict';

const path = require('path');

const config = {

    deploy: {
        types: ['service', 'nginx', 'nodejs', 'profile', 'metricbeat', 'logstash', 'kibana']
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
        },
        templates: {
            nginx: {
                path: __dirname + '/nginx/templates/'
            },
            logstash: {
                path: __dirname + '/logstash/templates/'
            },
            kibana: {
                path: __dirname + '/kibana/templates/'
            },
            metricbeat: {
                path: __dirname + '/metricbeat/templates/'
            }
        },
        service: {
            path: '/opt/soajs/node_modules/'
        },
        logging: {
            path: '/var/log/soajs/'
        }
    },

    nginx: {
        os: process.env.SOAJS_NX_OS || 'ubuntu',
        location: process.env.SOAJS_NX_LOC || '/etc/nginx',
        siteLocation: ((process.env.SOAJS_NX_SITE_PATH) ? path.join(process.env.SOAJS_NX_SITE_PATH, '/') : '/opt/soajs/site/'),
        masterDomain: process.env.SOAJS_NX_DOMAIN || 'soajs.org',
        config: {
            upstream: {
                ctrlPort: process.env.SOAJS_NX_CONTROLLER_PORT || '4000',
                ipEnvName: 'SOAJS_NX_CONTROLLER_IP_',
                upstreamName: 'soajs.controller',
                count: process.env.SOAJS_NX_CONTROLLER_NB || 1
            },
            apiConf: {
                fileName: 'api.conf',
                domain: process.env.SOAJS_NX_API_DOMAIN || 'api.soajs.org'
            },
            siteConf: {
                fileName: 'site.conf',
                domain: process.env.SOAJS_NX_SITE_DOMAIN,
                path: process.env.SOAJS_NX_SITE_PATH || '/opt/soajs/site'
            },
            ssl: {
                httpsApi: (process.env.SOAJS_NX_API_HTTPS && (process.env.SOAJS_NX_API_HTTPS == 1 ? true : false)) || false,
                httpApiRedirect: false, // computed field, depends on httpsApi, check end of file

                httpsSite: (process.env.SOAJS_NX_SITE_HTTPS && (process.env.SOAJS_NX_SITE_HTTPS == 1 ? true : false)) || false,
                httpSiteRedirect: false, // computed field, depends on httpsApi, check end of file

                customCerts: (process.env.SOAJS_NX_CUSTOM_SSL && (process.env.SOAJS_NX_CUSTOM_SSL == 1 ? true : false)) || false,
                customCertsPath: process.env.SOAJS_NX_SSL_CERTS_LOCATION || "/etc/soajs/ssl"
            }
        }
    },

    configRepo: {
        git: {
            provider: process.env.SOAJS_CONFIG_REPO_PROVIDER || 'github',
            domain: process.env.SOAJS_CONFIG_REPO_DOMAIN, // default value is computed, check end of file
            owner: process.env.SOAJS_CONFIG_REPO_OWNER || '',
            repo: process.env.SOAJS_CONFIG_REPO_NAME || '',
            branch: process.env.SOAJS_CONFIG_REPO_BRANCH || 'master',
            token: process.env.SOAJS_CONFIG_REPO_TOKEN || ''
        },
        settings: {
            configFileName: 'config.json'
        }
    },

    dashboard: {
        git: {
            provider: 'github',
            domain: 'github.com',
            owner: 'soajs',
            repo: 'soajs.dashboard',
            branch: process.env.SOAJS_GIT_DASHBOARD_BRANCH,
            path: '/ui'
        }
    },

    nodejs: {
        git: {
            provider: process.env.SOAJS_GIT_PROVIDER || 'github',
            domain: process.env.SOAJS_GIT_DOMAIN || 'github.com',
            owner: process.env.SOAJS_GIT_OWNER,
            repo: process.env.SOAJS_GIT_REPO,
            branch: process.env.SOAJS_GIT_BRANCH || 'master',
            token: process.env.SOAJS_GIT_TOKEN
        },
        main: process.env.SOAJS_SRV_MAIN || '.',
        memory: process.env.SOAJS_SRV_MEMORY
    },

    metricbeat: {
        configDir: process.env.SOAJS_METRICBEAT_CONFIG_DIR || '/metricbeat/',
        runScript: process.env.SOAJS_METRICBEAT_RUN_SCRIPT || 'start.sh'
    },

    logstash: {
        configDir: process.env.SOAJS_LOGSTASH_CONFIG_DIR || '/usr/share/logstash/config/'
    },

    kibana: {
        configDir: process.env.SOAJS_KIBANA_CONFIG_DIR || '/usr/share/kibana/config/'
    }

};

config.configRepo.git.domain = process.env.SOAJS_CONFIG_REPO_DOMAIN || ((config.configRepo.git.provider === 'github') ? 'github.com' : ((config.configRepo.git.provider === 'bitbucket') ? 'bitbucket.org' : ''));

config.nginx.config.ssl.httpApiRedirect = (config.nginx.config.ssl.httpsApi && process.env.SOAJS_NX_API_HTTP_REDIRECT && (process.env.SOAJS_NX_API_HTTP_REDIRECT == 1 ? true : false)) || false;
config.nginx.config.ssl.httpSiteRedirect = (config.nginx.config.ssl.httpsSite && process.env.SOAJS_NX_SITE_HTTP_REDIRECT && (process.env.SOAJS_NX_SITE_HTTP_REDIRECT == 1 ? true : false)) || false;

module.exports = config;
