
// import { kafka } from "./kafkaClient.js";
// import db from "../models/index.js";
// import { broadcastToEnquiry } from "../websocket/server.js";

// const Message = db.Message;
// let consumerActive = false;

// export const startMessageConsumer = async () => {
//   // If Kafka is not configured, skip entirely
//   if (!kafka) {
//     console.log("Kafka is disabled - running without message queue");
//     return;
//   }

//   try {
//     const consumer = kafka.consumer({
//       groupId: "message-consumer-group",
//       retry: {
//         retries: 2
//       }
//     });

//     console.log("Attempting to connect to Kafka...");

//     await Promise.race([
//       consumer.connect(),
//       new Promise((_, reject) =>
//         setTimeout(() => reject(new Error('Kafka connection timeout')), 5000)
//       )
//     ]);

//     // Subscribe to topic
//     await consumer.subscribe({ topic: "Message", fromBeginning: false });

//     await consumer.run({
//       eachMessage: async ({ topic, partition, message }) => {
//         try {
//           const data = JSON.parse(message.value.toString());
//           console.log("Kafka Message Received:", data);

//           //  REMOVED: Database save (already done in controller)
//           //  ONLY broadcast via WebSocket for real-time updates
          
//           // Get the message from database to ensure we have the correct ID
//           const existingMessage = await Message.findOne({
//             where: {
//               enquiry_id: data.enquiry_id,
//               sender_id: data.sender_id,
//               content: data.content
//             },
//             order: [['created_at', 'DESC']]
//           });

//           if (existingMessage) {
//             // Broadcast to WebSocket clients
//             broadcastToEnquiry(data.enquiry_id, {
//               ...existingMessage.toJSON(),
//               type: 'new_message'
//             });
//             console.log(" Message broadcasted to WebSocket clients for enquiry:", data.enquiry_id);
//           } else {
//             console.log(" Original message not found in database for broadcasting");
//           }

//         } catch (error) {
//           console.error("Error processing Kafka message:", error.message);
//         }
//       },
//     });

//     consumerActive = true;
//     console.log("Kafka consumer started successfully for topic: Message");

//   } catch (error) {
//     console.warn("Kafka not available, running without message queue:", error.message);
//   }
// };

// export const isConsumerActive = () => consumerActive;


export const startMessageConsumer = async () => {
  console.log("Kafka consumer disabled - using pure WebSocket implementation");
};

export const isConsumerActive = () => false;