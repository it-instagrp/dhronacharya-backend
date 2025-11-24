import { Kafka } from "kafkajs";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const kafkaDisabled = process.env.KAFKA_DISABLED === 'true';

let kafka = null;

if (!kafkaDisabled) {
  // Read CA certificate from src/certs folder
  const caCertPath = path.join(__dirname, 'certs', 'ca.pem');
  let caCert = null;
  
  try {
    caCert = fs.readFileSync(caCertPath, 'utf8');
    console.log("✅ CA certificate loaded successfully");
  } catch (error) {
    console.warn('⚠️ CA certificate file not found at:', caCertPath);
    console.warn('Kafka might not work properly without SSL certificate');
  }

  kafka = new Kafka({
    clientId: "dronacharya-message-service",
    brokers: [process.env.KAFKA_BROKER || "kafka-fbc81b-rockstarnihar22-be45.h.aivencloud.com:25233"],
    ssl: caCert ? {
      ca: [caCert],
      rejectUnauthorized: true
    } : false,
    sasl: {
      mechanism: 'plain',
      username: process.env.KAFKA_USERNAME || 'avnadmin',
      password: process.env.KAFKA_PASSWORD
    },
    retry: {
      initialRetryTime: 100,
      retries: 3,
      maxRetryTime: 3000,
    },
    connectionTimeout: 10000,
    requestTimeout: 10000,
  });
}

export { kafka };