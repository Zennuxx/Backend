const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

let waitingUser = null;

io.on('connection', (socket) => {
  console.log('user connected', socket.id);

  if (waitingUser) {
    // pair them
    const pair = waitingUser;
    waitingUser = null;
    socket.partner = pair;
    pair.partner = socket;

    socket.emit('paired');
    pair.emit('paired');
  } else {
    waitingUser = socket;
    socket.emit('paired', false);
  }

  socket.on('message', (msg) => {
    if (socket.partner) {
      socket.partner.emit('message', msg);
    }
  });

  socket.on('skip', () => {
    if (socket.partner) {
      socket.partner.emit('stranger_left');
      socket.partner.partner = null;
    }
    socket.partner = null;

    if (waitingUser && waitingUser !== socket) {
      waitingUser = socket;
      socket.emit('paired', false);
    } else {
      waitingUser = socket;
    }
  });

  socket.on('disconnect', () => {
    if (socket.partner) {
      socket.partner.emit('stranger_left');
      socket.partner.partner = null;
    }
    if (waitingUser === socket) waitingUser = null;
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));