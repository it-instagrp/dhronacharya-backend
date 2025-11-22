import { Kafka } from "kafkajs";

// Check if Kafka should be disabled
const kafkaDisabled = process.env.KAFKA_DISABLED === 'true';

let kafka = null;

if (!kafkaDisabled) {
  kafka = new Kafka({
    clientId: "dronacharya-message-service",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
    // Add retry configuration to limit retries
    retry: {
      initialRetryTime: 100,
      retries: 3, // Limit retries to 3 instead of infinite
      maxRetryTime: 3000, // Max 3 seconds total retry time
    },
    // Connection timeout
    connectionTimeout: 5000,
    // Request timeout  
    requestTimeout: 5000,
  });
}

export { kafka };