'use strict'

SocketIOClient = require 'socket.io-client'
Linda = require('linda/lib/linda-client')
Linda = window.Linda if window?
async = require 'async'

module.exports = class LindaAdapter
  constructor: (api, @options = {}) ->
    @api = api or 'http://babascript-linda.herokuapp.com'
    @functions = {}
      
  attach: (@baba) ->
    @connect()
    @message = @linda.tuplespace @baba.id
    if @linda.io.connected
      @baba.emit 'connect'
    else
      @linda.io.on 'connect', =>
        @baba.emit 'connect'

  connect: ->
    port = @options.port or process.env.PORT or 80
    socket = SocketIOClient.connect @api+":#{port}",
      'force new connection': true
    @linda = new Linda().connect socket

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
      async.parallel @functions[cid], (err, results) ->
        callback err, results
    else
      @functions[cid].push callback
      @message.take t, (err, tuple) ->
        callback err, tuple

  clientReceive: (tuple, callback) ->
    if tuple.type is 'broadcast' or tuple.type is 'cancel'
      @message.watch tuple, callback
    else
      @message.take tuple, (err, tuple) ->
        callback err, tuple

  cancel: (cid, reason) ->
    tuple =
      baba: 'script'
      cid: cid
      type: 'cancel'
      reason: reason
    @message.write tuple
    for i in [0..@functions[cid].length - 1]
      func = @functions[cid].shift()
      func null, {data: tuple}