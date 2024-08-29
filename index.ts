import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { Server } from "https://deno.land/x/socket_io@0.2.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { dirname } from "@std/path";
import { join } from "@std/path/join";

const __dirname = dirname(new URL(import.meta.url).pathname);
const app = new Application();
const router = new Router();
const port = parseInt(Deno.env.get("PORT") || "3000");

// Define routes (if needed, add more routes here)
router.get("/", (ctx) => {
  ctx.response.body = "Hello from Deno!";
});
app.use(router.routes());
app.use(router.allowedMethods());

const clients = new Map();
const sockets = new Map();

const io = new Server({
  cors: {
    // Allow any origin
    allowedOrigins: ["*"],
  },
});

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
    if (!socketId) return;

    console.log(`Client ${clientId} is being notified.`);
    io.to(socketId).emit("result", message);
    socket.emit("notify_ack", clientId);
  });
});


await serve(io.handler(), {
  port: 3000,
});

console.log(`Server is running on port ${port}`);