/**
 * MCFd - Daemon to control mfcd and run it in a seperate thread.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 1.0.0
 * @license MIT
 **/

'use strict';

// node.js api
const io   = require('socket.io')(),
      mfc  = require('node-mcf'),
      _log = require('./lib/log.js');

// our properties
const config = require('./config/config.json');

// MineCraft Framework
const M = new mfc(config);

io.on('connection', function(socket) {
  let dropAuth;

  if(config.mfcd !== undefined) {
    socket.isAuthenticated = false;
    dropAuth = setTimeout(function() {
      return socket.disconnect('AUTHTIMEOUT');
    }, 5000);
  } else {
    socket.isAuthenticated = true;
    _log('warn', 'authentication not configured, this is insecure.')
  }

  // optional authentication
  socket.on('authenticate', function(credentials) {
    if(!credentials.password || credentials.password !== config.mfcd.password) {
      return socket.disconnect();
    }

    _log('client authenticated.');
    socket.isAuthenticated = true;
    clearTimeout(dropAuth);
  });

  socket.on('sendCommand', function(object) {
    if(!socket.isAuthenticated) return false;

    if(object === undefined || object.command === undefined) {
      return socket.emit('res', {
        type: 'sendCommand',
        data: false
      });
    }

    return socket.emit('res', {
      type: 'sendCommand',
      data: M.sendCommand(object.command)
    });
  });

  socket.on('startServer', function(type) {
    if(!socket.isAuthenticated) {
      console.log('[mcfd] not authenticated, drop');
      return false;
    }

    let resp = function(data) {
      socket.emit('res', {
        type: 'startServer',
        data: data
      });
    }

    if(!M.isPtyRunning()) {
      M.startServer(undefined, config.minecraft.dir);
      return resp(true);
    } else {
      return resp(false);
    }
  })

  socket.on('status', function(type) {
    if(!socket.isAuthenticated) {
      console.log('[mcfd] not authenticated, drop');
      return false;
    }

    let status;
    if(M.isPtyRunning()) {
      status = 'up';
    } else {
      status = 'down';
    }

    return socket.emit('res', {
      type: 'status',
      data: status
    });
  })
});

// listen on 3000
io.listen(3000);
