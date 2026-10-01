const express = require('express');
const WebSocket = require('ws');

const app = express();
const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/tinwhmhhyctzfcjt3drh5a3wjf4yf891';

// Updated Xiaozhi Endpoint URL with your new token
const XIAOZHI_WS_URL = 'wss://api.xiaozhi.me/mcp/?token=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwNTM0MzgsImFnZW50SWQiOjI0MjgyNDYsImVuZHBvaW50SWQiOiJhZ2VudF8yNDI4MjQ2IiwicHVycG9zZSI6Im1jcC1lbmRwb2ludCIsImlhdCI6MTc5MDgzNjcxNSwiZXhwIjoxODIyMzk0MzE1fQ.gDnuxFbUMtffnDdgtJGTPrzGs5FfRyiz5M_Bo_atUZ3WzitTcpa5F-BSYwFg5UZqalWM0PQEkCpr7H1APunTeg';

app.get('/', (req, res) => {
  res.send('Xiaozhi Client Bridge is running!');
});

function connectToXiaozhi() {
  console.log('Connecting to Xiaozhi MCP Endpoint...');
  const ws = new WebSocket(XIAOZHI_WS_URL);

  ws.on('open', () => {
    console.log('Successfully connected to Xiaozhi Cloud!');
  });

  ws.on('message', async (data) => {
    try {
      const request = JSON.parse(data);
      console.log('Received from Xiaozhi:', request.method, 'ID:', request.id);

      // 1. Respond to ping
      if (request.method === 'ping') {
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: {} }));
      }

      // 2. Respond to initialize
      else if (request.method === 'initialize') {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'xiaozhi-app-launcher', version: '1.0.0' }
          }
        }));
      }

      // 3. Respond to tools/list
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
                    message: { type: 'string', description: 'Name of the app or game' }
                  },
                  required: ['message']
                }
              }
            ]
          }
        }));
      }

      // 4. Respond to tools/call
      else if (request.method === 'tools/call') {
        const appName = request.params?.arguments?.message || 'YouTube';
        console.log(`Executing launch request for: ${appName}`);

        try {
          await fetch(`${MAKE_WEBHOOK_URL}?message=${encodeURIComponent(appName)}`);
          console.log(`Dispatched ${appName} to Make.com successfully!`);
        } catch (err) {
          console.error('Make.com error:', err);
        }

        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{ type: 'text', text: `Opening ${appName}...` }]
          }
        }));
      }
    } catch (e) {
      console.error('Message parsing error:', e);
    }
  });

  ws.on('close', () => {
    console.log('Connection closed. Reconnecting in 5 seconds...');
    setTimeout(connectToXiaozhi, 5000);
  });

  ws.on('error', (err) => {
    console.error('WebSocket Error:', err.message);
  });
}

connectToXiaozhi();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});
  
