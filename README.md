# Baby Monitoring IoT Server

This server provides a simple API for your baby monitoring application to receive sensor data from IoT devices (ESP8266, Arduino Uno, etc.) and serve it to your frontend application.

## Features

- **Real-time data serving**: Provides sensor data to your baby monitoring application
- **Test data generation**: Automatically generates test data for development and testing
- **API endpoints**: Receive data from IoT devices and serve it to your application
- **Configurable**: Easy to configure through environment variables

## Setup Instructions

### Local Development
### done
1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     PORT=5000
     API_KEY=your-secret-api-key
     DEVICE_ID=baby-monitor-01
     ```

3. Start the server:
   ```
   npm start
   ```
   
### Deployment to Render

1. Create a Render account at [render.com](https://render.com)

2. Connect your GitHub repository to Render

3. Create a new Web Service with these settings:
   - **Name**: baby-monitoring-server
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. Add the following environment variables:
   - `NODE_ENV`: production
   - `API_KEY`: your-secret-api-key (use a strong, unique key)
   - `DEVICE_ID`: baby-monitor-01 (or your custom device ID)

5. Deploy the service

6. Update your ESP8266 code to use the Render URL instead of your local server

3. Start the server:
   ```
   npm start
   ```

4. For development with auto-restart:
   ```
   npm run dev
   ```

## API Endpoints

### GET `/readings`
- Used by your baby monitoring application to fetch sensor data
- Query parameters:
  - `deviceId`: The ID of the device (must match the configured DEVICE_ID)

### POST `/update-readings`
- Used by IoT devices (ESP8266, Arduino) to send sensor data
- Request body:
  ```json
  {
    "temperature": 23.5,
    "humidity": 45.0,
    "sound": 35.0,
    "apiKey": "your-secret-api-key"
  }
  ```

### POST `/trigger-test-data`
- Manually trigger generation of test data
- Request body:
  ```json
  {
    "apiKey": "your-secret-api-key"
  }
  ```

### POST `/test-data-control`
- Control automatic test data generation
- Request body:
  ```json
  {
    "action": "start", // or "stop"
    "apiKey": "your-secret-api-key"
  }
  ```

## Connecting Your Baby Monitoring App

Update your baby monitoring application's cloud configuration:
- Endpoint: `http://localhost:3000/readings`
- Device ID: `baby-monitor-01` (or whatever you set in .env)
- API Key: Leave blank or set as needed
- Refresh Interval: 5000 (5 seconds)

## ESP8266/Arduino Integration

For ESP8266:
```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server details
const char* serverUrl = "http://YOUR_SERVER_IP:3000/update-readings";
const char* apiKey = "your-secret-api-key";

// DHT sensor setup
#define DHTPIN 2      // Digital pin connected to the DHT sensor
#define DHTTYPE DHT22 // DHT 22 (AM2302)
DHT dht(DHTPIN, DHTTYPE);

// Sound sensor setup
#define SOUND_PIN A0  // Analog pin for microphone

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("WiFi connected");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    float sound = analogRead(SOUND_PIN) / 10.23; // Convert to dB (approx)
    
    if (!isnan(temperature) && !isnan(humidity)) {
      WiFiClient client;
      HTTPClient http;
      
      http.begin(client, serverUrl);
      http.addHeader("Content-Type", "application/json");
      
      StaticJsonDocument<200> doc;
      doc["temperature"] = temperature;
      doc["humidity"] = humidity;
      doc["sound"] = sound;
      doc["apiKey"] = apiKey;
      
      String jsonString;
      serializeJson(doc, jsonString);
      
      int httpCode = http.POST(jsonString);
      if (httpCode > 0) {
        String payload = http.getString();
        Serial.println(payload);
      }
      
      http.end();
    }
  }
  
  delay(5000);
}
```
