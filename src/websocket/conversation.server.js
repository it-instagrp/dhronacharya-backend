// src/websocket/conversation.server.js
import { WebSocketServer } from 'ws';

const conversationWss = new WebSocketServer({ port: 8081 });
const connectedConversationClients = new Map();

console.log("Conversation WebSocket server starting on port 8081...");

conversationWss.on('connection', (ws, request) => {
  try {
    // Parse conversationId from query parameters
    const url = new URL(request.url, `http://${request.headers.host}`);
    const conversationId = url.searchParams.get('conversationId');
    const userId = url.searchParams.get('userId');
    
    if (!conversationId || !userId) {
      ws.close(1008, 'conversationId and userId parameters required');
      return;
    }

    console.log(`New WebSocket connection for conversation: ${conversationId}, user: ${userId}`);
    
    // Store WebSocket connection
    const clientKey = `${conversationId}_${userId}`;
    if (!connectedConversationClients.has(conversationId)) {
      connectedConversationClients.set(conversationId, new Map());
    }
    connectedConversationClients.get(conversationId).set(userId, ws);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      message: `Connected to conversation ${conversationId}`,
      conversationId: conversationId,
      userId: userId
    }));

    ws.on('close', () => {
      console.log(`🔌 WebSocket disconnected for conversation: ${conversationId}, user: ${userId}`);
      connectedConversationClients.get(conversationId)?.delete(userId);
      if (connectedConversationClients.get(conversationId)?.size === 0) {
        connectedConversationClients.delete(conversationId);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for conversation ${conversationId}:`, error);
    });

    // Handle incoming messages from client
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'typing') {
          // Broadcast typing indicator to other user in conversation
          broadcastTypingIndicator(conversationId, userId, message.isTyping);
        }
      } catch (error) {
        console.error('Error processing client message:', error);
      }
    });

  } catch (error) {
    console.error('WebSocket connection error:', error);
    ws.close(1011, 'Internal server error');
  }
});

// Broadcast message to all clients in a specific conversation
export const broadcastToConversation = (conversationId, message) => {
  const clients = connectedConversationClients.get(conversationId);
  
  if (!clients || clients.size === 0) {
    console.log(`No connected clients for conversation ${conversationId}`);
    return;
  }

  let deliveredCount = 0;
  const messageString = JSON.stringify({
    ...message,
    timestamp: new Date().toISOString()
  });

  clients.forEach((client, userId) => {
    if (client.readyState === 1) { // 1 = OPEN
      try {
        client.send(messageString);
        deliveredCount++;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  });

  console.log(`Message broadcasted to ${deliveredCount} client(s) for conversation ${conversationId}`);
};

// Broadcast typing indicator
const broadcastTypingIndicator = (conversationId, senderId, isTyping) => {
  const clients = connectedConversationClients.get(conversationId);
  
  if (!clients || clients.size === 0) return;

  const typingMessage = JSON.stringify({
    type: 'typing',
    conversationId: conversationId,
    senderId: senderId,
    isTyping: isTyping,
    timestamp: new Date().toISOString()
  });

  clients.forEach((client, userId) => {
    if (userId !== senderId && client.readyState === 1) {
      try {
        client.send(typingMessage);
      } catch (error) {
        console.error('Error sending typing indicator:', error);
      }
    }
  });
};

console.log("Conversation WebSocket server started on port 8081");