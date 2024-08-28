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

const clients: Record<string, any> = {};

const io = new Server({
  cors: {
    // Allow any origin
    allowedOrigins: ["*"],
  },
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}; total connections: ${clients.length}`);

  // Send welcome message on connection
  socket.emit("message", "Welcome to the WebSocket server!");

  socket.on("register", (clientId) => {
    clients[clientId] = socket.id;
    console.log(`Client registered: ${clientId}`);
  });

  socket.on("disconnect", () => {
    for (const clientId in clients) {
      if (clients[clientId] === socket.id) {
        delete clients[clientId];
        console.log(`Client disconnected: ${clientId}; total connections: ${clients.length}`);
        break;
      }
    }
  });

  socket.on("error", (err) => {
    console.error("WebSocket error:", err);
  });

  socket.on("notify", (clientId, message) => {
    const socketId = clients[clientId];
    if (!socketId) return;

    io.to(socketId).emit("result", message);
  });
});

await serve(io.handler(), {
  port: 3000,
});

console.log(`Server is running on port ${port}`);