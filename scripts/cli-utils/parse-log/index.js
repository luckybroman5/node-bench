'use strict';

const args = require('args');

/** Project deps */
const { parseLogFileSync } = require('../../../lib/modules/LogParser');

args
.option('file', 'the log file to parse')
//.command('serve', 'Serve your static site', ['s']);

const flags = args.parse(process.argv)

console.log(flags);

if (!flags.file) {
    args.showHelp();
    process.exit();
}

const logFile = parseLogFileSync(flags.file);

// console.log(logFile);

console.log(JSON.stringify(logFile, null, 2));

