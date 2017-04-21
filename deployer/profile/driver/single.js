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

        "ssl": false,                              //Whether or not the connection requires SSL
        "sslValidate": true,               //Ensure we check server identify during SSL, set to false to disable checking
        "sslCA": null,                             //Array of valid certificates either as Buffers or Strings
        "sslCert": null,                           //String or buffer containing the certificate we wish to present
        "sslKey": null,                            //String or buffer containing the certificate private key we wish to present
        "sslPass": null,                           //String or buffer containing the certificate password
        "autoReconnect": true,                      //Reconnect on error for Single Server instances only

        "noDelay": true,                           //TCP Socket NoDelay option
        "keepAlive": 0,                            //TCP KeepAlive on the socket with a X ms delay before start
        "connectTimeoutMS": 30000,                 //connection timeout value in ms or 0 for never
        "socketTimeoutMS": 30000,                  //socket timeout value to attempt connection in ms or 0 for n
        "reconnectTries": 30,                      //Server attempt to reconnect #times
        "reconnectInterval": 1000,                 //Server will wait # milliseconds between retries

        "authSource": null,                         //specify a db to authenticate the user if the one he is connecting to doesn't do that

        "w": "majority",                            //values majority|number|<tag set>
        "wtimeout": 0,                              //timeout for w, 0 is for never
        "j": false,                                 //Specify a journal write concern.

        "forceServerObjectId": false,               //Force server to assign _id values instead of driver. default=false
        "serializeFunctions": false,                //Serialize functions on any object. default=false
        "ignoreUndefined": false,                   //Specify if the BSON serializer should ignore undefined fields. default=false
        "raw": false,                               //Return document results as raw BSON buffers. default=false
        "promoteLongs": true,                       //Promotes Long values to number if they fit inside the 53 bits reso
        "promoteBuffers": false,                    //Promotes Binary BSON values to native Node Buffers. ( new )
        "promoteValues": true,                      //Promotes BSON values to native types where possible, set to false to only receive wrapper types. ( new )
        "domainsEnabled": false,                    //Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit.

        "bufferMaxEntries": -1,                     //Sets a cap on how many operations the driver will buffer up before giving up on getting a working connection, default is -1 which is unlimited.
        "readPreference": null,
        "pkFactory": null,                          //A primary key factory object for generation of custom _id keys.
        "promiseLibrary": null,                     //A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
        "readConcern": null,

        "loggerLevel": null,                        //The logging level
        "logger": null                              //Custom logger object
    }
};

module.exports = singleProfile;