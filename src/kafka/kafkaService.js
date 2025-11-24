// // kafka/kafkaService.js
// import { connectProducer, disconnectProducer, checkProducerHealth, getQueueStatus } from './producer.js';
// import { startConsumer, stopConsumer, registerMessageHandler, isConsumerActive, getConsumerStatus } from './consumer.js';

// class KafkaService {
//   constructor() {
//     this.isInitialized = false;
//   }

//   // Initialize Kafka service
//   async initialize() {
//     if (this.isInitialized) {
//       console.log('Kafka service already initialized');
//       return true;
//     }

//     try {
//       // Connect producer
//       const producerConnected = await connectProducer();
      
//       // Start consumer if there are registered handlers
//       let consumerStarted = false;
//       if (isConsumerActive()) {
//         consumerStarted = await startConsumer();
//       }

//       this.isInitialized = producerConnected;
//       console.log(`Kafka service initialized - Producer: ${producerConnected}, Consumer: ${consumerStarted}`);
      
//       return this.isInitialized;
//     } catch (error) {
//       console.error('Failed to initialize Kafka service:', error);
//       this.isInitialized = false;
//       return false;
//     }
//   }

//   // Register consumer handler
//   registerHandler(topic, handler) {
//     registerMessageHandler(topic, handler);
//     console.log(`Registered handler for topic: ${topic}`);
//   }

//   // Get service status
//   getStatus() {
//     return {
//       initialized: this.isInitialized,
//       producer: {
//         healthy: checkProducerHealth(),
//         queue: getQueueStatus()
//       },
//       consumer: getConsumerStatus()
//     };
//   }

//   // Graceful shutdown
//   async shutdown() {
//     console.log('Shutting down Kafka service...');
    
//     await stopConsumer();
//     await disconnectProducer();
    
//     this.isInitialized = false;
//     console.log('Kafka service shutdown complete');
//   }
// }

// // Create singleton instance
// const kafkaService = new KafkaService();

// export default kafkaService;