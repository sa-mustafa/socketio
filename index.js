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

const clients = new Map();
const sockets = new Map();

// Socket.IO logic
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}; total connections: ${clients.size}`);

  // Send welcome message on connection
  socket.emit("message", "Welcome to the WebSocket server!");

  socket.on("register", (clientId) => {
    clients.set(clientId, socket.id);
    sockets.set(socket.id, clientId);
    console.log(`Client registered: ${clientId}`);
  });

  socket.on("disconnect", () => {
    const clientId = sockets.get(socket.id);
    if (!clientId) return;

    clients.delete(clientId);
    sockets.delete(socket.id);
    console.log(`Client disconnected: ${clientId}; total connections: ${clients.size}`);
  });

  socket.on("error", (err) => {
    console.error("WebSocket error:", err);
  });

  socket.on("notify", (clientId, message) => {
    const socketId = clients.get(clientId);
    if (!socketId) {
      socket.emit("notify_nak", clientId);
      return;
    }

    console.log(`Client ${clientId} is being notified.`);
    io.to(socketId).emit("result", message);
    socket.emit("notify_ack", clientId);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
