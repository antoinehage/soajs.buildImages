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
    }

};
