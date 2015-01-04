process.env.NODE_ENV = 'test'

path = require 'path'
assert = require 'assert'
LindaAdapter = require '../lib/adapter'

describe 'adapter', ->

  LindaAdapter.DEFAULT.address = 'http://localhost:3000'

  before (done) =>
    @app = require('http').createServer (req, res) ->
      _url = require('url').parse(decodeURI(req.url), true)
      if _url.pathname is '/'
        res.writeHead 200
        res.end 'linda test server'
    port = process.env.PORT or 8931
    @app.listen port
    @io = require('socket.io').listen @app
    linda  = require('linda').Server.listen {io: @io, server: @app}
    done()

  it 'should be LindaAdapter class instance', (done) ->
    adapter = new LindaAdapter()
    assert.ok adapter instanceof LindaAdapter
    done()

  it 'should api equal argument', (done) ->
    api = 'http://babascript-linda.herokuapp.com'
    adapter = new LindaAdapter api
    adapter.connect()
    assert.equal adapter.api, api
    adapter.linda.io.on "connect", ->
      done()

  it 'should connect linda-server assigned port', (done) ->
    api = 'http://localhost'
    port = 8931
    adapter = new LindaAdapter api, {port: port}
    adapter.connect()
    adapter.linda.io.on 'connect', ->
      done()

  # it 'should disconnect', (done) ->
  #   adapter = new LindaAdapter()
  #   adapter.connect()
  #   adapter.linda.io.on 'connect', ->
  #     adapter.disconnect()
  #   adapter.linda.io.on 'disconnect', ->
  #     done()
