'use strict';

const should = require('should');
const fs = require('fs');
const os = require('os');

/** Config */
const STRICTNESS = 0; // How much wiggle room for some exact calculations

// TODO turn this into flags
const expectNoNetworkLatency = true;

/** Globals */
const requestChains = require('../lib/modules/LogParser').parseLogFileSync('state.djson'); // Becomes a matrics or 2 dimensional array later

// console.log(JSON.stringify(requestChains, null, 2));

/** Sample Data */
const sample = {
  "interval": 122,
  "request_depth": 4,
  "previousSimulatedLatency": 1668,
  "totalSimulatedLatency": 1790,
  "randomNumLatency": 0,
  "previousRandomOverhead": 0,
  "totalRandomOverhead": 0,
  "approxNetLatency": 1691,
  "previousApproxNetLatency": 2160,
  "totalApproxNetLatency": 3851,
  "previousCallbackQueueLatencySample": 1,
  "requestId": "475ca37d-9870-41ca-9373-b2ef84827b25",
  "latency": 1816,
  "totalLatency": 5654,
  "previousLatency": 3838,
  "callbackQueueLatencySample": 3,
  "totalCallbackQueueLatencySamples": 13
};

/** Utility Functions */

/** Guarantees Order of keys */
function guaranteeOrder(truth = {}, inQuestion = {}) {
  const truthKeys = Object.keys(truth);
  const inQuestionKeys = Object.keys(inQuestion);
  truthKeys.forEach((key, index) => key.should.equal(inQuestionKeys[index]));
}

/** CHecks if the response hase 100^ of required fields */
function checkCompleteRequestObject(obj) {

  const sampleKeys = Object.keys(sample);

  obj.should.be.Object();
  
  
  const contract = sampleKeys.map((prop) => {
    const schema = {
      type: typeof sample[prop],
      name: prop,
    };

    obj[prop].should.be.type(schema.type);
    return schema;
  });
}

/** Chcks that the initial object is accurate 
 * Sample:
 * {"interval":809,"totalSimulatedLatency":809,"previousSimulatedLatency":0,"request_depth":1,"totalLatency":811,"previousLatency":0}
*/
function checkEndPointRequest(request) {
  checkCompleteRequestObject(request);
  request.request_depth.should.equal(1);
  request.interval.should.equal(request.totalSimulatedLatency);
  const initialZeroFields = Object.keys({
    "previousSimulatedLatency":0,
    "previousLatency":0,
    "previousRandomOverhead": 0,
    "previousApproxNetLatency": 0,
    "totalApproxNetLatency": 0,
    "approxNetLatency": 0,
    "previousCallbackQueueLatencySample": 2,
  });

  //console.log(initialZeroFields);
  //console.log(request);

  initialZeroFields.forEach((field) => request[field].should.be.equal(0));
}

/** Ensures the props in the request add upp */
function balanceRequest(request) {
  request.totalSimulatedLatency.should.equal(request.previousSimulatedLatency + request.interval);
  request.totalRandomOverhead.should.equal(request.previousRandom)
}


describe('Accuracy of JSON metrics from state file(s) per request chain', function() {
  Object.keys(requestChains).forEach((requestId, i) => {
  // for(let i=0; i<requestChains.length; i++) {
    const requestChain = requestChains[requestId];
    describe(`Request Chain: ${i}`, function() {

     requestChain.should.be.Array();
     console.log(`------------------ REQUEST CHAIN ${i} ----------------------------`);
     console.log(requestChain);

      // The request that was initially made by the psuedo client
      const entryPointRequest = requestChain[requestChain.length - 1];

      // The point where the coin flip just returned data withought a service call
      const endPointRequest = requestChain[0];

      //console.log(entryPointRequest);

      // global vars
      let sumLatency = 0;
      let sumSimulatedLatency = 0;
      let totalRandomOverhead = 0;
      let totalApproxNetLatency = 0;
      let callbackQueueLatencySample = 0;
      let totalCallbackQueueLatencySamples = 0;

      let last_request_depth = 0;
      
      it('should have an accurate terminated / endpoint log', function() {
        checkEndPointRequest(endPointRequest);
      });

      describe('Each request element', function() {
        requestChain.forEach((request) => {
          
          sumLatency += request.latency || 0;
          sumSimulatedLatency += request.interval || 0;
          totalRandomOverhead += request.randomNumLatency || 0;
          totalApproxNetLatency += request.approxNetLatency || 0;
          totalCallbackQueueLatencySamples += request.callbackQueueLatencySample || 0;

          it('should have the requests serially', function() {
            // console.log(request.request_depth);
            // console.log(last_request_depth);
            request.request_depth.should.equal(last_request_depth + 1);
            last_request_depth = request.request_depth;
          })

          it('should have all properties', function() {
            checkCompleteRequestObject(request);
          });

          it ('should have valid truth variables', function() {
            sumLatency.should.equal(sumSimulatedLatency + totalRandomOverhead + totalApproxNetLatency + totalCallbackQueueLatencySamples);
          });

          // the properties come in triplets.
          // One that represents just that one singular request
          // What the total was from the previous request
          // And finally what the new total is after this request

          it('should have an accurate totalSimulated latency', function() {
            request.totalSimulatedLatency.should.equal(request.interval + request.previousSimulatedLatency);
          });

          it('should have accurate totalRandomOverhead', function() {
            request.totalRandomOverhead.should.equal(request.previousRandomOverhead + request.randomNumLatency);
          });

          it('should have accurate total network latency', function() {
            request.totalApproxNetLatency.should.equal(request.previousApproxNetLatency + request.approxNetLatency);
          });

          it('should have no unaccounted for latency', function() {
            request.latency.should.equal(request.approxNetLatency + request.randomNumLatency + request.interval + request.callbackQueueLatencySample);
          })

          // After we have verified that each property is correct
          // Within just that one request, we need to verify
          // The actual values represent what was set in the responses


          it('should have an approx net valaue that is isolated to net latency for this request', function() {
            //console.log(request.approxNetLatency);
            request.approxNetLatency.should.equal(sumLatency - (sumSimulatedLatency + totalRandomOverhead + totalCallbackQueueLatencySamples + (totalApproxNetLatency - request.approxNetLatency)));
          });

          it('should have a randomNumLatency value isolated to this request', function() {
            request.randomNumLatency.should.equal(sumLatency - (sumSimulatedLatency + totalApproxNetLatency + totalCallbackQueueLatencySamples + (totalRandomOverhead - request.randomNumLatency)));
          });

          it('should have a simulated latency value isolated to this request', function() {
            request.interval.should.equal(sumLatency - (totalApproxNetLatency + totalRandomOverhead + totalCallbackQueueLatencySamples + (sumSimulatedLatency - request.interval)));
          });
        });
      })

      it('should have an accurate number of total latency', function() {
        sumLatency.should.equal(entryPointRequest.totalLatency);
      });

      it('should guarantee order of keys', function() {
        requestChain.forEach(request => guaranteeOrder(sample, request));
      });

      it('should have an accurate sum of simulated response latency', function() {
        entryPointRequest.totalSimulatedLatency.should.equal(sumSimulatedLatency);
      });

      it('should have an accurate sum of random number generation overhead', function() {
        totalRandomOverhead.should.equal(entryPointRequest.totalRandomOverhead);
      });

      it('should have an accurate sum of net latency', function() {
        totalApproxNetLatency.should.equal(entryPointRequest.totalApproxNetLatency);
      });

      it('should have no un-accounted for latency', function() {
        const trueSums = sumLatency + sumSimulatedLatency + totalRandomOverhead + totalApproxNetLatency;
      // console.log(sumLatency , sumSimulatedLatency , totalRandomOverhead , totalApproxNetLatency)
        const chainedSums = entryPointRequest.totalLatency + entryPointRequest.totalSimulatedLatency + entryPointRequest.totalRandomOverhead + entryPointRequest.totalApproxNetLatency;
        //console.log(trueSums);
        //console.log(chainedSums);
        Number(trueSums - chainedSums).should.equal(STRICTNESS);
      });

    });
  })
});
