import express from 'express'
import router from './routes/github.js'
import { errorHandler } from './middleware/errorHandler.js';
import { githubWebhookHandler } from './controllers/webhookController.js';
// this is the entry of the application
const app=express()
const PORT=process.env.PORT|| 8000
// Middlewares

var RateLimit = require('express-rate-limit');
const githubWebhookLimiter = RateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 5 minutes',
});
app.post(
  '/github/webhook',
  express.raw({ type: 'application/json' }),
  // AI FIX START
  githubWebhookLimiter, // Apply rate limiter here
  githubWebhookHandler(process.env.GITHUB_WEBHOOK_SECRET),
  // AI FIX END
);

// Routes
app.use('/github', router);

// Centralized error handler (should be after all routes)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
