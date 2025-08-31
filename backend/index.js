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
  require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // max 1000 requests per 15 minutes per IP
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  }),
  githubWebhookHandler(process.env.GITHUB_WEBHOOK_SECRET),
  // AI FIX END
);
app.use(express.json());

// Routes
app.use('/github', router);

// Centralized error handler (should be after all routes)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
