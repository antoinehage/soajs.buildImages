'use strict';
/*
 Mongo Configuration for driver version 2.2
 ------------------------------------------
 Full REF: http://mongodb.github.io/node-mongodb-native/

 CLIENT REF: http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html

 API REF: http://mongodb.github.io/node-mongodb-native/2.2/api

 DB REF: http://mongodb.github.io/node-mongodb-native/2.2/api/Db.html

 REPLICASET REF: http://mongodb.github.io/node-mongodb-native/2.2/api/ReplSet.html

 Setup Mongo + SSL: https://docs.mongodb.com/manual/tutorial/configure-ssl/

 MongoDB NodeJS Driver: http://mongodb.github.io/node-mongodb-native/2.2/reference/connecting/connection-settings/
 */
var singleProfile = {
//REF: https://docs.mongodb.com/manual/reference/connection-string/#connections-connection-options
    "name": "core_provision",
    "prefix": "",
    "servers": [],
    "credentials": null,
    "streaming": {
        "batchSize" : 10000,
        "colName":{
            "batchSize" : 10000
        }
    },
    "URLParam": {
        "poolSize": 5,                             //Default poolsize value
        "bufferMaxEntries": -1                     //Sets a cap on how many operations the driver will buffer up before giving up on getting a working connection, default is -1 which is unlimited.
    }
};

module.exports = singleProfile;