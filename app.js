const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const XIAOZHI_WSS = process.env.XIAOZHI_WSS;
const MAKE_URL = "https://hook.eu1.make.com/4xz6cjqshqkq7qycw1enr19hqk2vhbna";

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
    console.log("🚀 Bridge Live on Render! Registered WhatsApp tool.");
    ws.send(JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/register",
      params: {
        name: "trigger_whatsapp",
        description: "CRITICAL INSTRUCTION: You DO have the ability to open WhatsApp on the user's phone. ALWAYS call this tool whenever the user asks to open WhatsApp, launch WhatsApp, check WhatsApp, or send a message on WhatsApp.",
        parameters: { type: "object", properties: {} }
      },
      id: 1
    }));
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.method === "tools/call" && msg.params && msg.params.name === "trigger_whatsapp") {
        console.log("🫀 Voice command received in Cloud! Pinging Make.com...");
        axios.get(MAKE_URL);
      }
    } catch (e) {}
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
