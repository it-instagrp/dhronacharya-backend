// src/websocket/server.js
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
const connectedClients = new Map();

console.log("WebSocket server starting on port 8080...");

wss.on('connection', (ws, request) => {
  try {
    // Parse enquiryId from query parameters
    const url = new URL(request.url, `http://${request.headers.host}`);
    const enquiryId = url.searchParams.get('enquiryId');
    
    if (!enquiryId) {
      ws.close(1008, 'enquiryId parameter required');
      return;
    }

    console.log(`New WebSocket connection for enquiry: ${enquiryId}`);
    
    // Store WebSocket connection
    if (!connectedClients.has(enquiryId)) {
      connectedClients.set(enquiryId, new Set());
    }
    connectedClients.get(enquiryId).add(ws);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      message: `Connected to enquiry ${enquiryId}`,
      enquiryId: enquiryId
    }));

    ws.on('close', () => {
      console.log(`🔌 WebSocket disconnected for enquiry: ${enquiryId}`);
      connectedClients.get(enquiryId)?.delete(ws);
      if (connectedClients.get(enquiryId)?.size === 0) {
        connectedClients.delete(enquiryId);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for enquiry ${enquiryId}:`, error);
    });

  } catch (error) {
    console.error('WebSocket connection error:', error);
    ws.close(1011, 'Internal server error');
  }
});

// Broadcast message to all clients connected to a specific enquiry
export const broadcastToEnquiry = (enquiryId, message) => {
  const clients = connectedClients.get(enquiryId);
  
  if (!clients || clients.size === 0) {
    console.log(`No connected clients for enquiry ${enquiryId}`);
    return;
  }

  let deliveredCount = 0;
  const messageString = JSON.stringify({
    ...message,
    type: 'new_message',
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    if (client.readyState === 1) { // 1 = OPEN
      try {
        client.send(messageString);
        deliveredCount++;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  });

  console.log(`Message broadcasted to ${deliveredCount} client(s) for enquiry ${enquiryId}`);
};

console.log("WebSocket server started on port 8080");