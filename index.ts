import { Application, Router, serve } from "https://deno.land/x/oak@v9.1.1/mod.ts";
import { Server } from "https://deno.land/x/socket_io@v2.0.0/mod.ts";
import { join, dirname } from "https://deno.land/std@0.122.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.122.0/fs/ensure_dir.ts";

const __dirname = dirname(new URL(import.meta.url).pathname);
const app = new Application();
const router = new Router();
const port = parseInt(Deno.env.get("PORT") || "3000");

// Serve static files from the "public" directory
app.use(serve(join(__dirname, "public")));

// Define routes (if needed, add more routes here)
router.get("/", (ctx) => {
  ctx.response.body = "Hello from Deno!";
});
app.use(router.routes());
app.use(router.allowedMethods());

const clients: Record<string, any> = {};

// WebSocket logic
const server = new Server(app.listen({ port })); // Use Oak's listen method

server.on("connection", (socket) => {
  console.log(`Client connected: ${socket.remoteAddr}`);

  // Send welcome message on connection
  socket.send(JSON.stringify({ message: "Welcome to the WebSocket server!" }));

  socket.on("message", (msg) => {
    const data = JSON.parse(msg as string);
    if (data.type === "register") {
      clients[data.clientId] = socket;
      console.log(`Client registered: ${data.clientId}`);
    } else if (data.type === "notify") {
      const socketId = clients[data.clientId];
      if (socketId) {
        socketId.send(JSON.stringify({ type: "on_result", message: data.message }));
      }
    }
  });

  socket.onClose = () => {
    for (const clientId in clients) {
      if (clients[clientId] === socket) {
        delete clients[clientId];
        console.log(`Client disconnected: ${clientId}`);
        break;
      }
    }
  };

  socket.onError = (err) => {
    console.error("WebSocket error:", err);
  };
});

console.log(`Server is running on port ${port}`);