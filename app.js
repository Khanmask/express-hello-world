const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const XIAOZHI_WSS = process.env.XIAOZHI_WSS;
const MAKE_URL = "https://hook.eu1.make.com/4xz6cjhsqhkq7qycw1enr19hqk2vhbna";

app.get('/', (req, res) => {
  res.send('🚀 Xiaozhi Bridge is Live on Render!');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  connectXiaozhi();
});

function connectXiaozhi() {
  if (!XIAOZHI_WSS) {
    console.error("❌ XIAOZHI_WSS environment variable is missing!");
    return;
  }
  
  console.log("Connecting to Xiaozhi MCP via Cloud...");
  const ws = new WebSocket(XIAOZHI_WSS);

  ws.on('open', () => {
    console.log("🚀 Connected! Sending MCP initialized notification...");
    
    // Xiaozhi Official Protocol Handshake
    ws.send(JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    }));
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      // Handle Xiaozhi MCP Initialization query
      if (msg.method === "initialize") {
        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "Render-WhatsApp-Bridge", version: "1.0.0" }
          }
        }));
      }

      // Respond when Xiaozhi LLM queries available tools
      if (msg.method === "tools/list") {
        console.log("📋 Xiaozhi requested tools list. Sending self.trigger_whatsapp...");
        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            tools: [
              {
                name: "self.trigger_whatsapp",
                description: "Open, launch, or trigger WhatsApp on the user's mobile device.",
                inputSchema: {
                  type: "object",
                  properties: {}
                }
              }
            ]
          }
        }));
      }

      // Execute action when Xiaozhi LLM triggers the tool
      if (msg.method === "tools/call" && msg.params && (msg.params.name === "self.trigger_whatsapp" || msg.params.name === "trigger_whatsapp")) {
        console.log("🫀 Voice command received in Cloud! Pinging Make.com...");
        axios.get(MAKE_URL);

        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            content: [{ type: "text", text: "WhatsApp launched successfully." }]
          }
        }));
      }
    } catch (e) {
      console.error("Message parse error:", e);
    }
  });

  ws.on('close', () => {
    console.log("⚠️ Connection closed. Reconnecting in 5s...");
    setTimeout(connectXiaozhi, 5000);
  });

  ws.on('error', (err) => {
    console.error("Connection Error:", err.message);
    ws.close();
  });
}
