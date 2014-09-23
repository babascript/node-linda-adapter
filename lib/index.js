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
      this.functions = {};
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
        return async.parallel(this.functions[cid], callback);
      } else {
        this.functions[cid].push(callback);
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
