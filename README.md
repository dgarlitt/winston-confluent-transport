# winston-confluent-transport

This is a transport for use with the [winston logging package](https://www.npmjs.com/package/winston) that can be used to send logs to [Apache Kafka](https://kafka.apache.org/) via the [Confluent REST API](https://www.confluent.io/).

## Compatibility

Compatible with Winston >= 3.0

## Options

The following options are used to configure the transport:

 - `level` - (REQUIRED) The minimum log level for which this transport is enabled.
 - `topic` - (REQUIRED) The name of the Kafka topic
 - `url` - (REQUIRED) The URL (including port) of the Confluent REST API. Example: http://confluent.my-hostname.com:8082
 - `interval` - (OPTIONAL) A value in milliseconds to specify how often logs will be batch-sent to the Confluent server. If not provided, logs will be sent immediately.

### Basic Usage

```JavaScript
const { createLogger } = require('winston');
const ConfluentTransport = require('winston-confluent-transport');

const confluentTransport = new ConfluentTransport({
    level: 'info',
    topic: 'my-topic',
    host: KAFKA_REST_HOST,
    port: KAFKA_REST_PORT
  });

const logger = createLogger({
  transports: [ confluentTransport ]
});

logger.info('Send log to Kafka');
```

### React to Events

The `winston-confluent-transport` emits the following events:

 - `error` - This is emitted when Confluent is unable to fulfill a request. Arguments provided with the event are the `error` object returned and the `messages` that were being sent.
 - `success` - This is emitted when Confluent successfully processes a request. The `response` object is provided as an argument to the event.

Here is an example of handling the error event:

```JavaScript
const { createLogger, transports } = require('winston');
const ConfluentTransport = require('winston-confluent-transport');

const confluentTransport = new ConfluentTransport({
    level: 'info',
    topic: 'my-topic',
    host: KAFKA_REST_HOST,
    port: KAFKA_REST_PORT
  });

const consoleTransport = new transports.Console({
  level: 'error',
  json: true
});

const logger = createLogger({
  transports: [
    consoleTransport,
    confluentTransport
  ]
});

confluentTransport.on('error', (err, messages) => {
  logger.error({error: err, messageCount: messages.length});
});

logger.info('Send log to Kafka');
```