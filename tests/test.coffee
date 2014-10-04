process.env.NODE_ENV = 'test'

path = require 'path'
assert = require 'assert'
LindaAdapter = require '../lib/index'

describe 'adapter', ->

  script = require path.resolve()

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