const request = require('request');
const Transport = require('winston-transport');

module.exports = class ConfluentTransport extends Transport {
  constructor(opts) {
    super(opts);
    opts.flushStrategy = (opts.flushStrategy || '').toLowerCase();
    this.name = opts.name || 'ConfluentTransport';
    this.level = opts.level || 'info';
    this._baseUrl = opts.baseUrl;
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

    if (this._strategy.interval) {
      this._startInterval();
    }
  }

  log(info, callback) {
    if (this._strategy.immediate) {
      this._send([info])
      .then(() => callback())
      .catch(callback);
    } else {
      this._queue.push(info);
      callback();
    }
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
      .catch(() => {
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
    const content = { records: [] };
    messages.forEach(msg => {
      content.records[content.records.length] = { value: msg };
    });
    return new Promise((resolve, reject) => {
      const url = `${this._baseUrl.trim()}/topics/${this._topic.trim()}`;
      request(url, {
        body: JSON.stringify(content),
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.kafka.json.v2+json'
        }
      }, (err, res) => {
        if (!!err || res.statusCode < 200 || res.statusCode >= 300) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }
};