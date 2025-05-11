require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const apiKey = process.env.API_KEY || 'your-secret-api-key';
const deviceId = process.env.DEVICE_ID || 'baby-monitor-01';

// Log environment for debugging
console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
console.log(`Port: ${port}`);


// For Vercel serverless deployment
const isVercel = process.env.VERCEL === '1';

// Enable CORS and JSON parsing
app.use(cors({
  origin: isProduction ? ['https://baby-monitoring-app.onrender.com', 'https://baby-monitoring-client.onrender.com'] : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add basic health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Baby Monitoring IoT Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Store the latest sensor readings
let sensorData = {
  temperature: 20.5,
  humidity: 50.0,
  sound: 35.0,
  lastSync: new Date().toISOString(),
  connectionStatus: 'connected'
};

// Format sensor data to ensure consistent structure
function formatSensorData(data) {
  // Handle different possible field names from ESP8266/Arduino
  const temperature = data.temperature || data.tempDHT || data.temp || 0;
  const humidity = data.humidity || data.humid || 0;
  const sound = data.sound || data.soundValue || 0;
  
  return {
    temperature: parseFloat(temperature.toFixed(1)),
    humidity: parseFloat(humidity.toFixed(1)),
    sound: parseFloat(sound.toFixed(1)),
    lastSync: data.lastSync || new Date().toISOString(),
    connectionStatus: data.connectionStatus || 'connected'
  };
}

// Endpoint that your baby monitoring app will call
app.get('/readings', (req, res) => {
  // Check for deviceId parameter
  const requestDeviceId = req.query.deviceId;
  
  if (requestDeviceId && requestDeviceId !== deviceId) {
    console.log(`Invalid device ID: ${requestDeviceId}, expected: ${deviceId}`);
    return res.status(401).json({ error: 'Invalid device ID' });
  }
  
  // Log the request
  console.log(`GET /readings - Serving data for device: ${deviceId}`);
  console.log(`Current sensor data: ${JSON.stringify(sensorData)}`);
  
  // Return the current sensor data
  res.json(sensorData);
});

// Endpoint to update sensor readings (for ESP8266/Arduino)
app.post('/update-readings', (req, res) => {
  console.log('Received data from IoT device:', req.body);
  
  // Extract API key and device ID from request
  const requestApiKey = req.body.apiKey;
  const requestDeviceId = req.body.deviceId;
  
  // Simple API key validation
  if (requestApiKey !== apiKey) {
    console.log(`Invalid API key: ${requestApiKey}`);
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Device ID validation (if provided)
  if (requestDeviceId && requestDeviceId !== deviceId) {
    console.log(`Invalid device ID: ${requestDeviceId}`);
    return res.status(401).json({ error: 'Invalid device ID' });
  }
  
  // Update the sensor data with proper formatting
  // Pass the entire request body to formatSensorData to handle various field names
  sensorData = formatSensorData(req.body);
  
  // Log the processed data
  console.log('Processed sensor data:', sensorData);
  
  // Return success response with the processed data
  res.json({ 
    success: true, 
    data: sensorData,
    message: 'Data received and processed successfully'
  });
});

// Simple test endpoint for ESP8266 to verify connection
app.get('/test', (req, res) => {
  res.json({
    status: 'online',
    message: 'Baby Monitor IoT server is running',
    timestamp: new Date().toISOString(),
    serverInfo: {
      apiKey: apiKey.substring(0, 3) + '...' + apiKey.substring(apiKey.length - 3),
      deviceId: deviceId
    }
  });
});

// Start the server - listen on all network interfaces (0.0.0.0)
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Baby Monitor IoT server listening at http://0.0.0.0:${port}`);
  console.log(`Local access URL: http://localhost:${port}`);
  
  // In production, Render will provide the URL
  if (isProduction) {
    console.log(`Production server running on Render`);
  } else {
    // Only show local network URL in development
    console.log(`Network access URL: http://192.168.1.7:${port}`);
  }
  
  // Mask API key in logs for security
  const maskedApiKey = apiKey.substring(0, 3) + '...' + apiKey.substring(apiKey.length - 3);
  console.log(`API Key: ${maskedApiKey}`);
  console.log(`Device ID: ${deviceId}`);
  console.log('Server ready to receive real sensor data');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
