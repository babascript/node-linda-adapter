'use strict'

SocketIOClient = require 'socket.io-client'
Linda = require('linda/lib/linda-client')
Linda = window.Linda if window?
async = require 'async'

module.exports = class LindaAdapter
  @DEFAULT =
    address: 'http://babascript-linda.herokuapp.com'

  constructor: (api, @options = {}) ->
    @api = api or LindaAdapter.DEFAULT.address
    @functions = {}

  attach: (@baba) ->
    @connect()
    @result_queue    = @linda.tuplespace "#{@baba.id}_result_queue"
    @normal_queue    = @linda.tuplespace "#{@baba.id}_normal_queue"
    @interrupt_queue = @linda.tuplespace "#{@baba.id}_interrupt_queue"
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

  disconnect: ->
    @linda.io.disconnect()

  send: (data) ->
    # console.log data
    if data.type is 'return'
      @result_queue.write data
    else if data.options?.interrupt?
      data.type = 'interrupt'
      @interrupt_queue.write data
    else
      @normal_queue.write data

  receive: (tuple, callback) ->
    cid = tuple.cid
    t =
      baba: 'script'
      cid: cid
      type: 'return'
    @functions[cid] = []
    if tuple.type is 'broadcast'
      cs = []
      for i in [0..tuple.count]
        @functions[cid].push (c) =>
          cs.push c
          @result_queue.take t, (err, tuple) ->
            func = cs.shift()
            func(null, tuple)
      async.parallel @functions[cid], (err, results) =>
        callback err, results
        @functions[cid] = null
    else
      @functions[cid].push callback
      @result_queue.take t, (err, tuple) ->
        callback err, tuple

  clientReceive: (tuple, callback) ->
    return switch tuple.type
      when 'eval'
        return @normal_queue.option(sort: 'queue').take tuple, callback
      when 'broadcast', 'cancel'
        return @normal_queue.watch tuple, callback
      when 'interrupt'
        return @interrupt_queue.option(sort: 'queue')
        .take tuple, (err, tuple) ->
          callback err, tuple
      else
        return null

  stream: (callback) ->
    @normal_queue.option(sort: 'queue')
    .read {type: 'eval'}, (err, data) =>
      @normal_queue.watch {type: 'eval'}, callback
      callback err, data
    @interrupt_queue.option(sort: 'queue')
    .read {type: 'interrupt'}, (err, data) =>
      @interrupt_queue.watch {type: 'interrupt'}, callback
      callback err, data

  cancel: (cid, reason) ->
    tuple =
      baba: 'script'
      cid: cid
      type: 'cancel'
      reason: reason
    @normal_queue.write tuple
    # for i in [0..@functions[cid].length - 1]
    #   func = @functions[cid].shift()
    #   func null, {data: tuple}
