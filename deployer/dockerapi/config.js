/*jshint esversion: 6 */

module.exports = {

    token: process.env.DOCKER_API_TOKEN,

    network: process.env.SWARM_NETWORK || 'soajsnet',

    certs: {
        certPath: '/certs/client-cert.pem',
        keyPath: '/certs/client-key.pem'
    },

    server: {
        port: process.env.DOCKER_API_PORT || 2376
    },

    proxy: {
        options: {
            target: {
                socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock'
            }
        }
    },

    paths: {
        maintenance: {
        	route: '/maintenance'
        },
        metrics: {
        	route: '/metrics',
	        port: {
		        manager: process.env.DOCKER_API_MAINTENANCE_MANAGER_PORT || 2376,
		        worker: process.env.DOCKER_API_MAINTENANCE_WORKER_PORT || 2376
	        }
        }
    }

};
