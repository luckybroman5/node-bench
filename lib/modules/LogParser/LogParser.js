'use strict';

const _parseLogLine = function(line, requestChains) {
    let stateAction;
    try {
        stateAction = JSON.parse(line);
    } catch (e) {
        console.log('skipping state line because json parse failed: ' + line);
    }
    
    if (stateAction) {
        if (!stateAction.requestId) {
        throw new Error('Request Id not found in state action, therfore caannot build a request chain');
        process.exit();
        }
        if (!Object.keys(requestChains).find(id => id === stateAction.requestId)) {
            // there is a new chain
            requestChains[stateAction.requestId] = [];
        }
    
        requestChains[stateAction.requestId].push(stateAction);
    }
};

const parseLogFileSync = function(file = '') {
    const fs = require('fs');

    let fileData;
    const requestChains = {};

    try {
        fileData = fs.readFileSync(file).toString();
        fileData.split && fileData.split('\n').forEach(line => _parseLogLine(line, requestChains));
    } catch (e) {
        console.log('Error Reading File');
        throw e;
    }

    Object.keys(requestChains).forEach((requestId) => {
        const requestChain = requestChains[requestId];
        requestChain.sort((ra, rb) => {
            return ra.request_depth - rb.request_depth;
        });
    });

    return requestChains || {};
};

module.exports = {
    public: {
        parseLogFileSync,
    },
    private: {
        _parseLogLine,
    },
}
