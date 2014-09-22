(function() {
  var Linda, LindaAdapter, SocketIOClient, async;

  SocketIOClient = require('socket.io-client');

  Linda = require('linda/lib/linda-client');

  if (typeof window !== "undefined" && window !== null) {
    Linda = window.Linda;
  }

  async = require('async');

  module.exports = LindaAdapter = (function() {
    function LindaAdapter(api) {
      this.api = api || 'http://babascript-linda.herokuapp.com/';
    }

    LindaAdapter.prototype.attach = function(baba) {
      var socket;
      this.baba = baba;
      socket = SocketIOClient.connect(this.api, {
        'force new connection': true
      });
      this.linda = new Linda().connect(socket);
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

    LindaAdapter.prototype.send = function(data) {
      return this.message.write(data);
    };

    LindaAdapter.prototype.receive = function(tuple, callback) {
      var cid, cs, functions, i, t, _i, _ref;
      cid = tuple.cid;
      t = {
        baba: tuple.baba,
        cid: cid,
        type: 'return'
      };
      if (tuple.type === 'broadcast') {
        functions = [];
        cs = [];
        for (i = _i = 0, _ref = tuple.count; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
          functions.push((function(_this) {
            return function(c) {
              cs.push(c);
              return _this.message.take(t, function(err, tuple) {
                return cs.shift()(null, tuple);
              });
            };
          })(this));
        }
        return async.parallel(functions, callback);
      } else {
        return this.message.take(t, callback);
      }
    };

    LindaAdapter.prototype.clientReceive = function(tuple, callback) {
      if (tuple.type === 'broadcast' || tuple.type === 'cancel') {
        return this.message.watch(tuple, callback);
      } else {
        return this.message.take(tuple, callback);
      }
    };

    LindaAdapter.prototype.cancel = function(cid, reason) {
      var tuple;
      tuple = {
        cid: cid,
        type: 'cancel',
        reason: reason
      };
      return this.message.write(tuple);
    };

    return LindaAdapter;

  })();

}).call(this);
