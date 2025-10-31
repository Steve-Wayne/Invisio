import express from 'express'
import router from './routes/github.js'
import { errorHandler } from './middleware/errorHandler.js';
import { githubWebhookHandler } from './controllers/webhookController.js';
import { ConnectDB } from './services/db/mongo_db.js';
// this is the entry of the application
const app=express()
const PORT=process.env.PORT|| 8000
// Middlewares
await ConnectDB() 

var RateLimit = require('express-rate-limit');
// Configure a rate limiter for the GitHub webhook endpoint
var githubWebhookLimiter = RateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message:
    'Too many requests for the GitHub webhook, please try again after 5 minutes',
});
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  // AI FIX START
  githubWebhookLimiter, // Apply the rate limiter
  githubWebhookHandler(process.env.GITHUB_WEBHOOK_SECRET),
  // AI FIX END
);
app.use(express.json());

// Routes
app.use('/', router);

// Centralized error handler (should be after all routes)
app.use(errorHandler);


// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
