const KafkaRest = require('kafka-rest');
const Transport = require('winston-transport');

module.exports = class ConfluentTransport extends Transport {
  constructor(opts) {
    super(opts);
    opts.flushStrategy = (opts.flushStrategy || '').toLowerCase();
    this.name = opts.name || 'ConfluentTransport';
    this.level = opts.level || 'info';
    this._topic = opts.topic;
    this._interval = opts.interval || 1000;
    this._queue = [];
    this._pending = false;

    // Flush Strategys
    this._strategy = {};

    switch (opts.flushStrategy) {
      case 'manual':
        this._strategy.manual = true;
        break;
      case 'interval':
        this._strategy.interval = true;
        break;
      default:
        this._strategy.immediate = true;
    }

    this._kafka = new KafkaRest({
      url: opts.url
    });

    if (this._strategy.interval) {
      this._startInterval();
    }
  }

  log(info, callback) {
    const message = JSON.stringify(info);
    if (this._strategy.immediate) {
      this._send(message);
    } else {
      this._queue.push(message);
    }
    callback();
  }

  _startInterval() {
    this._bgProcess = setInterval((self) => {
      self.flushQueue();
    }, this._interval, this);
  }

  flushQueue() {
    if (!this._pending && this._queue.length) {
      this._pending = true;
      const numToSend = this._queue.length;
      const messages = this._queue.slice(0, numToSend);
      this._send(messages)
      .then(() => {
        this._queue.splice(0, numToSend);
        this._pending = false;
      })
      .catch((err) => {
        this._pending = false;
      });
    }
  }

  _send(messages) {
    this.emit('sending', messages);
    return new Promise((resolve, reject) => {
      this._request(messages)
      .then((res) => {
        this.emit('success', res);
        resolve(res);
      })
      .catch(err => {
        this.emit('error', err);
        reject(err);
      });
    });
  }

  _request(messages) {
    return new Promise((resolve, reject) => {
      this._kafka.topic(this._topic).produce(messages, (err, res) => {
        if (err) {
          this.emit('error', err, messages);
          reject(err);
        } else {
          this.emit('success', res);
          resolve(res);
        }
      });
    })
  }
};