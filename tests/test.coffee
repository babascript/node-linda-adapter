process.env.NODE_ENV = 'test'

path = require 'path'
assert = require 'assert'
LindaAdapter = require '../lib/index'
Script = require 'babascript'
Client = require 'babascript-client'

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
