const Koa = require('koa');
const serve = require('koa-static');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = new Koa();
const server = http.createServer(app.callback());
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// Serve static files
app.use(serve(path.join(__dirname, 'public')));

// Handle the root route
app.use(async (ctx) => {
  if (ctx.path === '/') {
    ctx.type = 'html';
    ctx.body = require('fs').createReadStream(path.join(__dirname, 'index.html'));
  }
});

const clients = {};

// Socket.IO logic
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}; total connections: ${clients.length}`);

  // Send welcome message on connection
	socket.emit("message", "Welcome to the WebSocket server!");

  socket.on("register", (clientId) => {
    clients[clientId] = socket.id;
    console.log(`client registered: ${clientId}`);
  });

  socket.on("disconnect", () => {
    for (let clientId in clients) {
      if (clients[clientId] === socket.id) {
        delete clients[clientId];
        console.log(`Client disconnected: ${clientId}; total connections: ${clients.length}`);
        break;
      }
    }
  });

  socket.on("notify", (clientId, message) => {
    const socketId = clients[clientId];
    if (!socketId) return;

    io.to(socketId).emit("result", message);
  });

  socket.on("connect_error", (err) => {
    console.log(`connect_error due to ${err.message}`);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
