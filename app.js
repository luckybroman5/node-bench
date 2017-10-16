'use strict';

/** An isomorphic server-client to simulate a microservice env for nodejs build benchmarks */

//TODO: Allow for configuration for:
   /**
    * -simulated latency
    * - configuration file
    */
// TODO: add a random failure rate
// TODO: 
    /**
     * Save a file on each request in order to playback interval by interval, service, to service for subsequent tests
     */


/** NODEJS NAITIVE modules */
const http = require('http');
const fs = require('fs');
const os = require('os');

/** 3rd part deps */
const rn = require('random-number');
const uuid4 = require('uuid/v4');

/** General Config */
const SERVER_HOST = '127.0.0.1';
const SERVER_PORT = '8000';
const SERVICE_HOSTS = [{ host: SERVER_HOST, port: SERVER_PORT }];
const STATE_FILE_NAME = 'state.djson';
const GENERATE_STATE_FILE = true;


/** Random Opts */
const interval_options = {
    min:  30,
    max:  1000,
    integer: true
};

const retry_interval_options = {
    min: 10,
    max: 200,
    integer: true,
};

const random_service_options = {
    min: 0,
    max: SERVICE_HOSTS.length - 1,
    integer: true,
};

const coin_flip = {
    min: 0,
    max: 1,
    integer: true,
};

/** Random Functions */

function generateRandom(opts = {}, reqStats = {}) {
    const s = new Date().getTime();
    const random = rn(opts);
    
    reqStats.randomNumLatency += (new Date().getTime()) - s;
    return random;
}

function makeRequest(hostname = null, options = {}, cb, reqStats = {}) {
    if (!hostname) return;
    
    const port = options.port || '80';
    const method = options.method && options.method.toUpperCase ? options.method.toUpperCase() : 'GET';
    const path = options.path && options.path.toLowerCase ? options.path : '';
        
    // make a request to a tunneling proxy
    const opts = {
        port,
        hostname,
        method,
        path: `/${reqStats.requestId}`,
    };

    const req = http.request(opts);
    const s = new Date().getTime();
    req.end();

    let rawData = '';

    req.once('response', (res) => {
        const ip = req.socket.localAddress;
        const port = req.socket.localPort;
        // console.log(res);
        // console.log(`Your IP address is ${ip} and your source port is ${port}.`);
        res.on('data', (chunk) => {
            rawData += chunk.toString();
        });

        res.on('end', () => {
            const json = JSON.parse(rawData);
            reqStats.approxNetLatency += (new Date().getTime()) - s;
            cb(json, Object.assign({}, reqStats));
        });

        // err('Something went wrong going to the server');
    });
}

function err(mess) {
    throw new Error(mess);
}

function serviceRequest(cb, reqStats = {}) {
    // const randomOpts

    const index = generateRandom(random_service_options, reqStats);

    const port = SERVICE_HOSTS[index].port;
    const host = SERVICE_HOSTS[index].host;
    makeRequest(host, { port }, cb, reqStats);
}

const server = http.createServer((req, res) => {

    const start = new Date().getTime();

    // init
    const reqStats = {
        randomNumLatency: 0,
        approxNetLatency: 0,
    };

    const interval = generateRandom(interval_options, reqStats);
    
    reqStats.requestId = req.url && req.url.length && req.url.length > 1 ? reqStats.requestId = req.url.replace('/', '') : uuid4();

    // console.log(interval);
    const response = {
        body: {
            interval,
        },
    };

    const respond = (serviceResponse = {}, exp) => {

        // This is where data is received and pasted through the request chain 

        const body = Object.assign({}, response.body);
        body.request_depth = (serviceResponse.request_depth || 0) + 1;

        body.interval = interval;
        body.previousSimulatedLatency = (serviceResponse.totalSimulatedLatency || 0);
        body.totalSimulatedLatency = (serviceResponse.totalSimulatedLatency || 0) + (interval || 0);

        body.randomNumLatency = reqStats.randomNumLatency;
        body.previousRandomOverhead = (serviceResponse.totalRandomOverhead || 0);
        body.totalRandomOverhead = (serviceResponse.totalRandomOverhead || 0) + reqStats.randomNumLatency;

        body.approxNetLatency = reqStats.approxNetLatency - (serviceResponse.randomNumLatency || 0);
        body.previousApproxNetLatency = (serviceResponse.totalApproxNetLatency || 0);
        body.totalApproxNetLatency = (serviceResponse.totalApproxNetLatency || 0) + body.approxNetLatency;

        body.previousCallbackQueueLatencySample = (serviceResponse.callbackQueueLatencySample || 0);

        body.requestId = reqStats.requestId;

        setTimeout(() => {
            body.latency = (new Date().getTime()) - start;
            body.totalLatency = (serviceResponse.totalLatency || 0) + body.latency;
            body.previousLatency = serviceResponse.totalLatency || 0;
            body.callbackQueueLatencySample = body.latency - (body.approxNetLatency + body.randomNumLatency + body.interval);
            body.totalCallbackQueueLatencySamples = body.callbackQueueLatencySample + (serviceResponse.totalCallbackQueueLatencySamples || 0);
            res.end(JSON.stringify(body, null, 2));
            if (GENERATE_STATE_FILE) {
                fs.appendFile(STATE_FILE_NAME, JSON.stringify(body).replace(`${os.EOL}`, '') + os.EOL, (e) => {
                    if (e) console.log(e);
                    else console.log('Successfully Wrote Data to file');
                });
            }   
        }, interval);
    };

    if (generateRandom(coin_flip, reqStats)) {
        serviceRequest(respond, reqStats);
    } else {
        respond();
    }

});

server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\ros.EOL\ros.EOL');
});

/** Test Variables */
// server.timeout = 1000;

server.listen(SERVER_PORT, SERVER_HOST);
