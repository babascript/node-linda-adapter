SocketIOClient = require 'socket.io-client'
Linda = require('linda/lib/linda-client')
Linda = window.Linda if window?
async = require 'async'

module.exports = class LindaAdapter
  constructor: (@api = 'http://linda.babascript.org') ->
    @member = []
      
  attach: (@baba) ->
    socket = SocketIOClient.connect @api, {'force new connection': true}
    @linda = new Linda().connect socket
    @message = @linda.tuplespace @baba.id
    @membership = @linda.tuplespace 'membership'
    if @linda.io.socket.open
      @baba.emit "connect"
    else
      @linda.io.on 'connect', =>
        @baba.emit 'connect'

  send: (data) ->
    return @message.write data

  receive: (tuple, callback) ->
    cid = tuple.cid
    t =
      baba: tuple.baba
      cid: cid
      type: 'return'
    if tuple.type is 'broadcast'
      functions = []
      cs = []
      for i in [0..tuple.count]
        functions.push (c) =>
          cs.push c
          @message.take t, (err, tuple) ->
            cs.shift()(null, tuple)
      async.parallel functions, callback
    else
      @message.take t, callback

  clientReceive: (tuple, callback) ->
    if tuple.type is 'broadcast' or tuple.type is 'cancel'
      @message.watch tuple, callback
    else
      @message.take tuple, callback

  cancel: (cid, reason) ->
    tuple =
      cid: cid
      type: 'cancel'
      reason: reason
    @message.write tuple