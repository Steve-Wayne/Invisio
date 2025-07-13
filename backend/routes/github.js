import express, { Router } from 'express';
import { authenticate_app, fetch_installations, generate_install_token, get_id, getRepository, checkRepoWebhook, getUserInstallationsAndReposController } from '../controllers/githubcontrollers.js';
import { getRepoAlerts, generateAutofix, generateAutofixesPullRequest, enableSmartDependabot } from '../controllers/alertcontroller.js';
import { githubWebhookHandler } from '../controllers/webhookController.js';
import dotenv from 'dotenv';
const RateLimit = require('express-rate-limit');

dotenv.config();

const router = Router();

const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

router.use(limiter);

router.route('/app/:owner/:repo/contents').get((req, res, next) => {
  console.log('Find workflows for');
  next();
}, getRepository);

router.route('/app/:owner/:repo/variables').get((req, res, next) => {
  console.log("Get secrets for ");
  next();
}, getRepoAlerts);

router.route('/app/:owner/:repo/fixalerts').post((req, res, next) => {
  console.log('Generate autofix for');
  next();
}, generateAutofix);

router.route('/app').get((req, res, next) => {
  console.log("APP_AUTH REQUEST FOR");
  next();
}, authenticate_app);

router.route('/app/installations').get((req, res, next) => {
  console.log("No of Installations");
  next();
}, fetch_installations);

router.route('/app/installations/:id').post((req, res, next) => {
  console.log("Request for install token creation");
  next();
}, generate_install_token);

router.route('/app/installations/get/:id').get((req, res, next) => {
  console.log("Request for id verification");
  next();
}, get_id);

router.route('/app/:owner/:repo/fix_alerts').post((req, res, next) => {
  console.log("Alert autofix commsion request");
  next();
}, generateAutofixesPullRequest);

router.get('/app/:owner/:repo/has-webhook', checkRepoWebhook);

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  githubWebhookHandler(process.env.GITHUB_WEBHOOK_SECRET),
);

router.get('/app/user/:userLogin/installations', getUserInstallationsAndReposController);

router.route('/app/:owner/:repo/enable-dependabot').post((req, res, next) => {
  console.log('Enable smart dependabot for', req.params.owner, req.params.repo);
  next();
}, enableSmartDependabot);

export default router;