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
    function LindaAdapter(api, options) {
      this.options = options != null ? options : {};
      this.api = api || 'http://babascript-linda.herokuapp.com';
      this.functions = {};
    }

    LindaAdapter.prototype.attach = function(baba) {
      this.baba = baba;
      this.connect();
      this.message = this.linda.tuplespace(this.baba.id);
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

    LindaAdapter.prototype.send = function(data) {
      return this.message.write(data);
    };

    LindaAdapter.prototype.receive = function(tuple, callback) {
      var cid, cs, i, t, _i, _ref;
      cid = tuple.cid;
      t = {
        baba: tuple.baba,
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
              return _this.message.take(t, function(err, tuple) {
                return cs.shift()(null, tuple);
              });
            };
          })(this));
        }
        return async.parallel(this.functions[cid], function(err, results) {
          return callback(err, results);
        });
      } else {
        this.functions[cid].push(callback);
        return this.message.take(t, function(err, tuple) {
          return callback(err, tuple);
        });
      }
    };

    LindaAdapter.prototype.clientReceive = function(tuple, callback) {
      if (tuple.type === 'broadcast' || tuple.type === 'cancel') {
        return this.message.watch(tuple, callback);
      } else {
        return this.message.take(tuple, function(err, tuple) {
          return callback(err, tuple);
        });
      }
    };

    LindaAdapter.prototype.cancel = function(cid, reason) {
      var func, i, tuple, _i, _ref, _results;
      tuple = {
        baba: 'script',
        cid: cid,
        type: 'cancel',
        reason: reason
      };
      this.message.write(tuple);
      _results = [];
      for (i = _i = 0, _ref = this.functions[cid].length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        func = this.functions[cid].shift();
        _results.push(func(null, {
          data: tuple
        }));
      }
      return _results;
    };

    return LindaAdapter;

  })();

}).call(this);
