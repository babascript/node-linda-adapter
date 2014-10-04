process.env.NODE_ENV = 'test'

path = require 'path'
assert = require 'assert'
LindaAdapter = require '../lib/index'

describe 'adapter', ->

  script = require path.resolve()

  before (done) ->
    app = require('http').createServer (req, res) ->
      _url = require('url').parse(decodeURI(req.url), true)
      if _url.pathname is '/'
        res.writeHead 200
        res.end 'linda test server'
    port = process.env.PORT or 8931
    app.listen port
    io = require('socket.io').listen app
    linda  = require('linda').Server.listen {io: io, server: app}
    done()

  it 'should be LindaAdapter class instance', (done) ->
    adapter = new LindaAdapter()
    assert.ok adapter instanceof LindaAdapter
    done()

  it 'should api equal argument', (done) ->
    api = 'http://linda.babascript.org'
    adapter = new LindaAdapter api
    assert.equal adapter.api, api
    done()

  it 'should connect linda-server assigned port', (done) ->
    api = 'http://localhost'
    port = 8931
    adapter = new LindaAdapter api, {port: port}
    adapter.connect()
    adapter.linda.io.on 'connect', ->
      done()