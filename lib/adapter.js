(function() {
  'use strict';
  var Linda, LindaAdapter, SocketIOClient, async;

  SocketIOClient = require('socket.io-client');

  Linda = require('linda/lib/linda-client');

  if (typeof window !== "undefined" && window !== null) {
    Linda = window.Linda;
  }

  async = require('async');

  module.exports = LindaAdapter = (function() {
    LindaAdapter.DEFAULT = {
      address: 'http://babascript-linda.herokuapp.com'
    };

    function LindaAdapter(api, options) {
      this.options = options != null ? options : {};
      this.api = api || LindaAdapter.DEFAULT.address;
      this.functions = {};
    }

    LindaAdapter.prototype.attach = function(baba) {
      this.baba = baba;
      this.connect();
      this.result_queue = this.linda.tuplespace("" + this.baba.id + "_result_queue");
      this.normal_queue = this.linda.tuplespace("" + this.baba.id + "_normal_queue");
      this.interrupt_queue = this.linda.tuplespace("" + this.baba.id + "_interrupt_queue");
      if (this.linda.io.connected) {
        return this.baba.emit('connect');
      } else {
        return this.linda.io.on('connect', (function(_this) {
          return function() {
            return _this.baba.emit('connect');
          };
        })(this));
      }
    };

    LindaAdapter.prototype.connect = function() {
      var port, socket;
      port = this.options.port || process.env.PORT || 80;
      socket = SocketIOClient.connect(this.api + (":" + port), {
        'force new connection': true
      });
      return this.linda = new Linda().connect(socket);
    };

    LindaAdapter.prototype.disconnect = function() {
      return this.linda.io.disconnect();
    };

    LindaAdapter.prototype.send = function(data) {
      var _ref;
      if (data.type === 'return') {
        return this.result_queue.write(data);
      } else if (((_ref = data.options) != null ? _ref.interrupt : void 0) != null) {
        data.type = 'interrupt';
        return this.interrupt_queue.write(data);
      } else {
        return this.normal_queue.write(data);
      }
    };

    LindaAdapter.prototype.receive = function(tuple, callback) {
      var cid, cs, i, t, _i, _ref;
      cid = tuple.cid;
      t = {
        baba: 'script',
        cid: cid,
        type: 'return'
      };
      this.functions[cid] = [];
      if (tuple.type === 'broadcast') {
        cs = [];
        for (i = _i = 0, _ref = tuple.count; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
          this.functions[cid].push((function(_this) {
            return function(c) {
              cs.push(c);
              return _this.result_queue.take(t, function(err, tuple) {
                var func;
                func = cs.shift();
                return func(null, tuple);
              });
            };
          })(this));
        }
        return async.parallel(this.functions[cid], (function(_this) {
          return function(err, results) {
            callback(err, results);
            return _this.functions[cid] = null;
          };
        })(this));
      } else {
        this.functions[cid].push(callback);
        return this.result_queue.take(t, function(err, tuple) {
          return callback(err, tuple);
        });
      }
    };

    LindaAdapter.prototype.clientReceive = function(tuple, callback) {
      switch (tuple.type) {
        case 'eval':
          return this.normal_queue.option({
            sort: 'queue'
          }).take(tuple, callback);
        case 'broadcast':
        case 'cancel':
          return this.normal_queue.watch(tuple, callback);
        case 'interrupt':
          return this.interrupt_queue.option({
            sort: 'queue'
          }).take(tuple, function(err, tuple) {
            return callback(err, tuple);
          });
        default:
          return null;
      }
    };

    LindaAdapter.prototype.stream = function(callback) {
      this.normal_queue.option({
        sort: 'queue'
      }).read({
        type: 'eval'
      }, (function(_this) {
        return function(err, data) {
          _this.normal_queue.watch({
            type: 'eval'
          }, callback);
          return callback(err, data);
        };
      })(this));
      return this.interrupt_queue.option({
        sort: 'queue'
      }).read({
        type: 'interrupt'
      }, (function(_this) {
        return function(err, data) {
          _this.interrupt_queue.watch({
            type: 'interrupt'
          }, callback);
          return callback(err, data);
        };
      })(this));
    };

    LindaAdapter.prototype.cancel = function(cid, reason) {
      var tuple;
      tuple = {
        baba: 'script',
        cid: cid,
        type: 'cancel',
        reason: reason
      };
      return this.normal_queue.write(tuple);
    };

    return LindaAdapter;

  })();

}).call(this);
