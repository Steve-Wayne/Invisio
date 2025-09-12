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
  githubWebhookHandler(process.env.GITHUB_WEBHOOK_SECRET)
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
