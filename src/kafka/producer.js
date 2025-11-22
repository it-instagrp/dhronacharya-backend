import { kafka } from "./kafkaClient.js";

let producer = null;
let isProducerConnected = false;

// Initialize producer only if Kafka is available
if (kafka) {
  producer = kafka.producer({
    retry: {
      retries: 2
    }
  });

  const connectProducer = async () => {
    try {
      await producer.connect();
      isProducerConnected = true;
      console.log("✅ Kafka producer connected");
    } catch (error) {
      console.warn("⚠️ Kafka producer connection failed");
      isProducerConnected = false;
    }
  };

  connectProducer();
}

export const sendKafkaMessage = async (topic, message) => {
  // Skip if Kafka is not configured or producer not connected
  if (!kafka || !producer || !isProducerConnected) {
    return; // Silently skip
  }
  
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }]
    });
  } catch (error) {
    // Silently fail - don't log to reduce noise
  }
};