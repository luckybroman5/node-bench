# What is this?
This is a barebones, isomorphic, nodejs web server built to test different versions, builds, and configurations of the nodejs platform.

It makes use of very few 3rd party libraries, however all http components are the naitvie http module. This allows for extremely low variances and simplicity for the tests.

Isomorphic, or "Universal" in nature allows for it easily simulate a microservice environment of any size. It can even run standalone and request itself.

Regardless of size, metrics are past from one request to another depending upon various factors. Accurate and precise metrics are compiled at the end and are verfied via mocha

The version it was written in is nodejs 8.x to test it's experimental features.


# How does it work?
Simple. In it's default, local configuration, it is a single web server which will accept requests on any path at a configured port. When a request comes in, a psuedo random decision will be made.

- IN one scenario, a response will be returned immediately. This is to simulate responses from an endpoint that may be cached or in memory.

- IN another scenario, a network call will be requested to itself. When it recieves this request, it will make another psuedo random descion. It can either make another service call, or return immediately just like above. Once a service immediately responds without making another call, the rest of the service calls down stream can be completed. This grouping of requests is calld a "Request Chain".

- Every time a response is served from the web server, metrics are calculated and returned in the response body, as well as saved to a global log file.

- The metrics from one response effect the metrics from all other down the request chain

- As soon as there is at least 1 complete request chain in the log, it can be tested and verified to be accurate and correct.

- Once verified accurate and complete, any form of custom report can be generated.

# First Run

## Start Server for testing

Clone this repo ```&& cd```

```
$ NODE_PATH=/your/custom/node/build
$ node app.js
```

## Running with Apache Bench

```
$ ab -n 1000 -c 3 "http://localhost:8000/"
```

## Basic Run

You'll need to do this until request_depth in the response is > 1, this means at least 1 service call was made
```
$ curl localhost:8000
```

You can see the logs in state.djson file. When multiple lines are added after a single curl request, that is also an indicator there was at least 1 service call

From this point, any custom script can be written to parse the log file to extract any information you may be interested in gathering.

## Verifying Log Files

```
# Verify the log file is correct, accurate, and complete
$ mocha tests/state.spec.js
```

# Notes on Logs

- Generated in a "Delimeted" JSON format, meaning each new line is a new JSON object.
    - The equivilent would be simply wrapping it in a JSON array and adding commas
    - This allows for a slightly smaller payload.
- Logs, when verified via the mocha scripts, are assembled, then each value is accounted for. If there is any additional metric that is causing addition latency, the tests are intended to fail.
- The mocha test will just skip over newlines so a sloppy copy and paste is even enough to combine logs from multiple servers.
    - The JSON parser by default is inteded and will throw an error to kill the process in the event of malformed json.

# Utilities
Out of the box, is a log parser which can be ran on any file by simply running:

```npm run parseLog {file}```

- It will pretty print the organized request chains.
- This is the same code that the log verifier uses


# Config Variables

### Server

- ```simulate-latency``` Will generate a psuedo random interval to wait before responding to requests to simulate more complex service processing

### Mocha

#### todo
- multiple input uri's

### todo
 - max-calls largest amount of service calls
 - min-calls minimum amount of service calls
 - remote-hosts JSON array of host:port

# Upcoming Features
- Ability to pass command line args to script
- Ability to run multiple web servers to participate in the test
  - Locally
  - Deploy to cloud
- Reload and replay a state with different configurations
- More Metrics?
