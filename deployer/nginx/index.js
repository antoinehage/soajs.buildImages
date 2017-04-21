'use strict';

const log = require('util').log;
const async = require('async');

const config = require('../config.js');
const ssl = require('./lib/certs.js');
const conf = require('./lib/conf.js');
const sites = require('./lib/sites.js');
const upstream = require('./lib/upstream.js');

// async.series([
//     ssl.init,
//     conf.write,
//     upstream.getUpstream,
//     //clone dashboard ui here (if applicable)
//     sites.getSites,
//     //start nginx service here
// ], (error) => {
//
// });
