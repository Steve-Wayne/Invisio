import crypto from "crypto";
import { InvisioFlow } from "../services/WorkflowService.js";
import {
  handleWorkflowFailure,
  handleInstallationEvent,
  handlePullRequestEvent,
  handleCheckRunEvent,
} from "./eventsHandler.js";

function verifySignature(req, secret) {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature || !secret) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(req.body);
  const digest = "sha256=" + hmac.digest("hex");

  if (signature.length !== digest.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export const githubWebhookHandler = (secret) => async (req, res, next) => {
  if (!verifySignature(req, secret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.headers["x-github-event"];
  const payload = JSON.parse(req.body.toString("utf8"));

  try {
    if(event === "installation_repositories") {
      console.log("Received installation_repositories event:", payload.action);
      const user = await handleInstallationEvent(payload, event);
      return res.status(200).json({
        message: "installation_repositories handled",
        user,
      });
    }if (event === "pull_request") {
      console.log("Received pull_request event:", payload.action);
      await handlePullRequestEvent(payload);
    } else if (event === "code_scanning_alert") {
      console.log("Received code_scanning_alert event:", payload.action);
    } else if (event === "check_run") {
      console.log("Received check_run event:", payload.action);
      await handleCheckRunEvent(payload);
    } 
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
