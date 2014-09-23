SocketIOClient = require 'socket.io-client'
Linda = require('linda/lib/linda-client')
Linda = window.Linda if window?
async = require 'async'

module.exports = class LindaAdapter
  constructor: (api) ->
    @api = api or 'http://babascript-linda.herokuapp.com/'
    @functions = {}
      
  attach: (@baba) ->
    socket = SocketIOClient.connect @api, {'force new connection': true}
    @linda = new Linda().connect socket
    @message = @linda.tuplespace @baba.id
    if @linda.io.connected
      @baba.emit 'connect'
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
    @functions[cid] = []
    if tuple.type is 'broadcast'
      cs = []
      for i in [0..tuple.count]
        @functions[cid].push (c) =>
          cs.push c
          @message.take t, (err, tuple) ->
            cs.shift()(null, tuple)
      async.parallel @functions[cid], callback
    else
      @functions[cid].push callback
      @message.take t, callback

  clientReceive: (tuple, callback) ->
    if tuple.type is 'broadcast' or tuple.type is 'cancel'
      @message.watch tuple, callback
    else
      @message.take tuple, callback

  cancel: (cid, reason) ->
    tuple =
      baba: 'script'
      cid: cid
      type: 'cancel'
      reason: reason
    @message.write tuple
    for i in [0..@functions[cid].length-1]
      func = @functions[cid].shift()
      func null, {data: tuple}