'use strict';

//This script reads the container record and prints ip or task name
//Only supports swarm deployment, not reqiured for kubernetes

var input = process.stdin;
var output = process.stdout;

var inputData = '', container = {};
var swarmNetwork = 'soajsnet';
var value = process.argv[2];

input.setEncoding('utf8');
input.on('readable', function () {
    var chunk = input.read();
    if (chunk) {
        inputData += chunk;
    }
});

input.on('end', function () {
    try {
        container = JSON.parse(inputData);
    }
    catch (e) {
        output.write('');
    }

    if (value === 'ip') {
        var network = container.NetworkSettings.Networks[swarmNetwork];
        output.write(network.IPAddress);
    }
    else if (value === 'name') {
        output.write(container.Config.Labels['com.docker.swarm.task.name']);
    }
});
