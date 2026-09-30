const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const XIAOZHI_WSS = process.env.XIAOZHI_WSS;
const MAKE_URL = "https://hook.eu1.make.com/4xz6cjhsqhkq7qycw1enr19hqk2vhbna";

// Health check endpoint for UptimeRobot
app.get('/', (req, res) => {
  res.send('🚀 Xiaozhi Bridge is 100% Active and Awake!');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  connectXiaozhi();
});

function connectXiaozhi() {
  if (!XIAOZHI_WSS) {
    console.error("❌ XIAOZHI_WSS variable missing!");
    return;
  }
  
  console.log("Connecting to Xiaozhi MCP via Cloud...");
  const ws = new WebSocket(XIAOZHI_WSS);
  let pingInterval;

  ws.on('open', () => {
    console.log("🚀 Bridge Live! Handshaking Xiaozhi...");
    
    // Initializing Handshake
    ws.send(JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    }));

    // Keep-alive heartbeat ping every 30s
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);
  });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.method === "initialize") {
        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "Render-WhatsApp-Dynamic-Bridge", version: "2.0.0" }
          }
        }));
      }

      // Dynamic Schema requesting Recipient and Message
      if (msg.method === "tools/list") {
        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            tools: [
              {
                name: "self.trigger_whatsapp",
                description: "Send a WhatsApp message or open a chat with a specific contact.",
                inputSchema: {
                  type: "object",
                  properties: {
                    recipient: { 
                      type: "string", 
                      description: "The name or phone number of the contact." 
                    },
                    message: { 
                      type: "string", 
                      description: "The message text to send." 
                    }
                  },
                  required: ["recipient", "message"]
                }
              }
            ]
          }
        }));
      }

      // Handle function call and extract arguments
      if (msg.method === "tools/call" && msg.params && (msg.params.name === "self.trigger_whatsapp" || msg.params.name === "trigger_whatsapp")) {
        const args = msg.params.arguments || {};
        const recipient = args.recipient || "Contact";
        const messageText = args.message || "";

        console.log(`🫀 Command Received -> Contact: ${recipient} | Text: ${messageText}`);

        // Post variables directly to Make.com
        await axios.post(MAKE_URL, { 
          recipient: recipient, 
          message: messageText 
        });

        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            content: [{ type: "text", text: `WhatsApp message triggered for ${recipient}.` }]
          }
        }));
      }
    } catch (e) {
      console.error("Message parse error:", e);
    }
  });

  ws.on('close', () => {
    clearInterval(pingInterval);
    console.log("⚠️ Disconnected! Reconnecting in 5s...");
    setTimeout(connectXiaozhi, 5000);
  });

  ws.on('error', (err) => {
    clearInterval(pingInterval);
    ws.close();
  });
}
