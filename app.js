// San Diego Tide SMS App
// Dependencies: express, twilio
// Run: npm install express twilio
// Set environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse URL-encoded bodies (Twilio webhook format)
app.use(express.urlencoded({ extended: false }));

// San Diego NOAA station ID
const SD_STATION_ID = '9410170';

// Function to get today's tide data from NOAA
async function getTideData() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
      `date=today&station=${SD_STATION_ID}&product=predictions&datum=MLLW&` +
      `time_zone=lst_ldt&interval=hilo&units=english&format=json&application=TideSMS`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.predictions || data.predictions.length === 0) {
      return "No tide data available for today.";
    }
    
    let message = "San Diego Tides Today:\n";
    
    data.predictions.forEach(prediction => {
      const time = new Date(prediction.t).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
      });
      const height = parseFloat(prediction.v).toFixed(1);
      const type = prediction.type === 'H' ? 'High' : 'Low';
      
      message += `${type}: ${time} (${height}ft)\n`;
    });
    
    return message.trim();
    
  } catch (error) {
    console.error('Error fetching tide data:', error);
    return "Sorry, couldn't get tide data right now. Try again later.";
  }
}

// Twilio webhook endpoint
app.post('/sms', async (req, res) => {
  const incomingMessage = req.body.Body?.toLowerCase().trim() || '';
  
  // Get tide data
  const tideInfo = await getTideData();
  
  // Create TwiML response
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${tideInfo}</Message>
</Response>`;
  
  res.type('text/xml');
  res.send(twiml);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'San Diego Tide SMS service is running' });
});

// Test endpoint to see tide data without SMS
app.get('/test', async (req, res) => {
  const tideInfo = await getTideData();
  res.type('text/plain');
  res.send(tideInfo);
});

app.listen(port, () => {
  console.log(`Tide SMS app listening at http://localhost:${port}`);
  console.log(`Webhook URL: http://localhost:${port}/sms`);
  console.log(`Test URL: http://localhost:${port}/test`);
});

// Export for testing
module.exports = app;
