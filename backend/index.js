javascript;
import express from 'express';
import router from './routes/github.js';
import { errorHandler } from './middleware/errorHandler.js';
import { githubWebhookHandler } from './controllers/webhookController.js';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 8000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);
app.use(express.json());

app.post(
  '/github/webhook',
  express.raw({ type: 'application/json' }),
  githubWebhookHandler(process.env.GITHUB_WEBHOOK_SECRET),
);

app.use('/github', router);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});