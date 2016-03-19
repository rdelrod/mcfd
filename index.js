/**
 * MCFd - Daemon to control mfcd and run it in a seperate thread.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 1.0.0
 * @license MIT
 **/

'use strict';

// node.js api
const io        = require('socket.io')(),
      mfc       = require('node-mcf'),
      spawnSync = require('child_process').spawnSync,
      _log      = require('./lib/log.js');

// our properties
const config = require('./config/config.json');

// MineCraft Framework
const M = new mfc(config);

io.on('connection', function(socket) {
  // Begin authentication system.
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

  /**
   * sendCommand
   *
   * Send a command to the PTY.
   **/
  socket.on('sendCommand', function(object) {
    if(!socket.isAuthenticated) return false;

    if(!M.isPtyRunning()) {
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

  /**
   * startServer
   *
   * Start the Minecraft startServer
   **/
  socket.on('startServer', function() {
    if(!socket.isAuthenticated) return false;

    const resp = function(data) {
      socket.emit('res', {
        type: 'startServer',
        data: data
      });
    }

    const isPtyRunning = M.isPtyRunning();
    if(!isPtyRunning) { // start the server if it isn't running.
      M.startServer(undefined, config.minecraft.dir);
    }

    return resp(!isPtyRunning);
  })

  /**
   * status
   *
   * Get the server status.
   **/
  socket.on('status', function() {
    if(!socket.isAuthenticated) {
      console.log('[mcfd] not authenticated, drop');
      return false;
    }

    let status = 'down';
    if(M.isPtyRunning()) {
      status = 'up';
    }

    return socket.emit('res', {
      type: 'status',
      data: status
    });
  })

  /**
   * forceKill
   *
   * Essentially killall -9 java
   **/
  socket.on('forceKill', function() {
    if(!socket.isAuthenticated) return false;

    spawnSync('killall', ['-9', 'java']);

    return socket.emit('res', {
      type: 'forceKill',
      data: true
    });
  })
});

// listen on 3000
io.listen(config.port);
