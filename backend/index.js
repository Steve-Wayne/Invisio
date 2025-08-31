import express from 'express'
import router from './routes/github.js'
import { errorHandler } from './middleware/errorHandler.js';
import { githubWebhookHandler } from './controllers/webhookController.js';
// this is the entry of the application
const app=express()
const PORT=process.env.PORT|| 8000
// Middlewares

app.post(
  '/github/webhook',
  express.raw({ type: 'application/json' }),
  // AI FIX START
  // Define and apply a rate limiter for this specific route, e.g.:
  // const githubWebhookRateLimiter = require('express-rate-limit')({
  //   windowMs: 15 * 60 * 1000, // 15 minutes
  //   max: 50, // Max 50 requests per IP per 15 minutes
  //   message: 'Too many GitHub webhook requests from this IP, please try again after 15 minutes',
  //   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  //   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // });
  githubWebhookRateLimiter,
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
