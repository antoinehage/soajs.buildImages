/*jshint esversion: 6 */

const fs = require('fs');
const url = require('url');
const path = require('path');
const https = require('https');
const log = require('util').log;
const httpProxy = require('http-proxy');
const spawn = require('child_process').spawn;

const lib = require('./lib/index.js');

const dockerapi = {

	init: function(options, cb) {
		const generateCerts = spawn('bash', [ '-c', './generate_certs.sh' ], { stdio: 'inherit', cwd: path.join(__dirname, options.dockerapi.scripts.scriptsPath) });

		generateCerts.on('data', (data) => {
			console.log(data.toString());
		});

		generateCerts.on('close', (code) => {
			log(`Certificates script process exited with code: ${code}`);
			return dockerapi.deployAPI(options);
		});
		generateCerts.on('error', (error) => {
			log(`Certificates script process failed with error: ${error}`);
			return cb(error);
		});
	},

	deployAPI: function (options) {
		const proxyServer = httpProxy.createProxyServer({});

		const serverOptions = {
			key: fs.readFileSync(path.join(__dirname, options.dockerapi.certs.keyPath)),
			cert: fs.readFileSync(path.join(__dirname, options.dockerapi.certs.certPath))
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

			if (pathname === options.dockerapi.paths.maintenance.route) {
				return lib.maintenance(req, res, options);
			}
			else if (pathname === options.dockerapi.paths.metrics.route) {
				return lib.metrics(req, res, options);
			}

			proxyServer.web(req, res, options.dockerapi.proxy.options);
		}

		function checkAccess(req) {
			if (req && req.headers && req.headers['token']) {
				if (req.headers['token'] === options.dockerapi.token) {
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

		https.createServer(serverOptions, proxy).listen(options.dockerapi.server.port, '0.0.0.0');

		if (process.env.NODE_TYPE === 'manager') {
			lib.checkSwarmNetwork(options);
		}
	}

};

module.exports = {
	deploy: dockerapi.init
};
