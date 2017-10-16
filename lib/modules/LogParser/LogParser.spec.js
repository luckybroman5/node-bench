'use strict';

const logParser = require('./LogParser');

const should = require('should');

const file = './lib/modules/LogParser/fixtures/sample-log.djson';

describe('Log Parser public methods', function() {

    const logData = logParser.public.parseLogFileSync(file);

    it('should only have matching request ids', function() {
        Object.keys(logData).forEach((requestId) => {
            const requestChain = logData[requestId];
            requestChain.forEach((request) => {
                request.requestId.should.equal(requestId);
            });
        })
    });

    it('should all return in the correct order', function() {
        Object.keys(logData).forEach((requestId) => {
            const requestChain = logData[requestId];
            requestChain.forEach((request, index) => {
                request.request_depth.should.equal(index + 1);
            });
        })
    });
});
