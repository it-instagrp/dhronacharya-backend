import { kafka } from './src/kafka/kafkaClient.js';

async function testKafkaProducer() {
  try {
    const producer = kafka.producer();
    await producer.connect();
    
    console.log('✅ Kafka producer connected for testing');

    // Test data - use your actual enquiry ID
    const testMessage = {
      enquiry_id: '37b1b77c-3d6c-43e7-9c64-771d8e43ff78', // Your enquiry ID
      sender_id: '1e2a4ce2-a8ee-42c2-87ff-3cdfdc0bfb4d', // Your user ID
      content: 'Test message from Kafka producer script',
      sent_at: new Date()
    };

    // Send multiple test messages
    for (let i = 1; i <= 5; i++) {
      const message = {
        ...testMessage,
        content: `Test message ${i} - ${new Date().toISOString()}`
      };

      await producer.send({
        topic: 'Message',
        messages: [
          {
            value: JSON.stringify(message)
          }
        ]
      });

      console.log(`✅ Sent test message ${i}:`, message.content);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }

    await producer.disconnect();
    console.log('✅ All test messages sent');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testKafkaProducer();