javascript;
import express from 'express';
import router from './routes/github.js';
import { errorHandler } from './middleware/errorHandler.js';
import { githubWebhookHandler } from './controllers/webhookController.js';
import RateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});
app.use(limiter);

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