const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/tinwhmhhyctzfcjt3drh5a3wjf4yf891';

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.send('Xiaozhi MCP Bridge is live!');
});

wss.on('connection', (ws) => {
  console.log('Xiaozhi Connected!');

  ws.on('message', async (message) => {
    try {
      const request = JSON.parse(message);
      console.log('Method received:', request.method);

      // 1. Ping
      if (request.method === 'ping') {
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: {} }));
      }

      // 2. Initialize
      else if (request.method === 'initialize') {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'xiaozhi-bridge', version: '1.0.0' }
          }
        }));
      }

      // 3. Tools List
      else if (request.method === 'tools/list') {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              {
                name: 'open_app',
                description: 'Launches an Android application or game on the user device by name (e.g., YouTube, WhatsApp, Bloodstrike, PUBG)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Name of the app' }
                  },
                  required: ['message']
                }
              }
            ]
          }
        }));
      }

      // 4. Tools Call
      else if (request.method === 'tools/call') {
        const appName = request.params?.arguments?.message || 'YouTube';
        
        // Trigger Make.com Webhook
        try {
          await fetch(`${MAKE_WEBHOOK_URL}?message=${encodeURIComponent(appName)}`);
        } catch (e) {
          console.error('Make webhook error:', e);
        }

        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{ type: 'text', text: `Launching ${appName}...` }]
          }
        }));
      }
    } catch (err) {
      console.error('JSON Parsing error:', err);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
