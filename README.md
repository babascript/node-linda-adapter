# Babascript LindaAdapter 

LindaAdapter is default communication adapter for Babascript.

## usage
    
    Babascript = require 'babascript'
    Client     = require 'babascript-client'
    LindaAdapter = require 'linda-adapter'

    adapter = new LindaAdapter(address)
    baba = new Babascript "baba"
    baba.attach adapter

    client = new Client "baba"
    client.attach adapter

## TODO

- write test code
- debug