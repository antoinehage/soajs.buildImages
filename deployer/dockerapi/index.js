/*jshint esversion: 6 */

const fs = require('fs');
const url = require('url');
const path = require('path');
const https = require('https');
const log = require('util').log;
const httpProxy = require('http-proxy');

const config = require('./config.js');
const lib = require('./lib/index.js');

module.exports = {
	deployAPI: function (options, callback) {
		const proxyServer = httpProxy.createProxyServer({});
		
		const options = {
			key: fs.readFileSync(path.join(__dirname, config.certs.keyPath)),
			cert: fs.readFileSync(path.join(__dirname, config.certs.certPath))
		};
		
		function proxy(req, res) {
			let requestIp = req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress);
			let pathname = url.parse(req.url).pathname;
			log(`Incoming call from ${requestIp} -> ${req.method} ${pathname}`);
			
			if (!checkAccess(req)) {
				log(`Request from ${requestIp} is not authorized, aborting ...`);
				
				res.writeHead(401);
				res.end('unauthorized\n');
				return;
			}
			
			if (pathname === config.paths.maintenance.route) {
				return lib.maintenance(req, res);
			}
			else if (pathname === config.paths.metrics.route) {
				return lib.metrics(req, res);
			}
			
			proxyServer.web(req, res, config.proxy.options);
		}
		
		function checkAccess(req) {
			if (req && req.headers && req.headers['token']) {
				if (req.headers['token'] === config.token) {
					return true;
				}
			}
			
			return false;
		}
		
		proxyServer.on('error', (error, req, res) => {
			log(error);
			res.writeHead(500);
			res.end('internal server error');
		});
		
		https.createServer(options, proxy).listen(config.server.port, '0.0.0.0');
		
		if (process.env.NODE_TYPE === 'manager') {
			lib.checkSwarmNetwork();
		}
	}
};