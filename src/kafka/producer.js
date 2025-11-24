import { kafka } from "./kafkaClient.js";

let producer = null;
let isProducerConnected = false;

// Initialize producer only if Kafka is available
if (kafka) {
  producer = kafka.producer({
    retry: {
      retries: 1
    }
  });

  const connectProducer = async () => {
    try {
      await producer.connect();
      isProducerConnected = true;
      console.log("Kafka producer connected");
    } catch (error) {
      console.warn("Kafka producer connection failed");
      isProducerConnected = false;
    }
  };

  connectProducer();
}

export const sendKafkaMessage = async (topic, message) => {
  // Skip if Kafka is not configured or producer not connected
  if (!kafka || !producer || !isProducerConnected) {
    console.log("Kafka not available, skipping message");
    return;
  }
  
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }]
    });
    console.log("Message sent to Kafka topic:", topic);
    console.log("Message content:", message);
  } catch (error) {
    console.error("Failed to send message to Kafka:", error.message);
  }
};