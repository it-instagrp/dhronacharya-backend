import { kafka } from "./kafkaClient.js";
import db from "../models/index.js";

const Message = db.Message;

let consumerActive = false;

export const startMessageConsumer = async () => {
  // If Kafka is not configured, skip entirely
  if (!kafka) {
    console.log("ℹ️ Kafka is disabled - running without message queue");
    return;
  }

  try {
    const consumer = kafka.consumer({ 
      groupId: "chat-consumer-group",
      // Reduce retries for consumer
      retry: {
        retries: 2
      }
    });
    
    console.log("🔄 Attempting to connect to Kafka...");
    
    // Connection with timeout
    await Promise.race([
      consumer.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Kafka connection timeout')), 5000)
      )
    ]);

    await consumer.subscribe({ topic: "chat-messages", fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log("📩 Kafka Message Received:", data);

          await Message.create({
            conversation_id: data.conversation_id,
            sender_id: data.sender_id,
            content: data.content
          });
        } catch (error) {
          console.error("Error processing Kafka message:", error.message);
        }
      },
    });

    consumerActive = true;
    console.log("✅ Kafka consumer started successfully");
    
  } catch (error) {
    console.warn("⚠️ Kafka not available, running without message queue");
    // Don't log the full error to reduce noise
  }
};

export const isConsumerActive = () => consumerActive;