// Simple health check script
import http from 'http';

const options = {
  host: 'localhost',
  port: 8000,
  timeout: 2000,
  path: '/github/app/installations' // You can change this to a specific health check endpoint if you have one
};

const request = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  if (res.statusCode == 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', function(err) {
  console.error('Health check failed:', err);
  process.exit(1);
});

request.end();
