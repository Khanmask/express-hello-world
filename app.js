const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const XIAOZHI_WSS = process.env.XIAOZHI_WSS;
// Verified active Make.com webhook URL
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
    console.log("🚀 Bridge Live on Render! Connected to Xiaozhi MCP.");
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      // Respond when Xiaozhi LLM queries available tools
      if (msg.method === "tools/list") {
        console.log("📋 Xiaozhi requested tools list. Sending trigger_whatsapp...");
        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            tools: [
              {
                name: "trigger_whatsapp",
                description: "CRITICAL: You MUST call this tool whenever the user asks to open WhatsApp, check WhatsApp, or launch WhatsApp.",
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
      if (msg.method === "tools/call" && msg.params && msg.params.name === "trigger_whatsapp") {
        console.log("🫀 Voice command received in Cloud! Pinging Make.com...");
        axios.get(MAKE_URL);

        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            content: [{ type: "text", text: "WhatsApp opened successfully." }]
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
