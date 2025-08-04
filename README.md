# Backend API Endpoints

This document lists all available API endpoints for the backend service. Use these endpoints to integrate with the frontend or for testing purposes.

---

## General App Endpoints

- **GET `/app`**
  - Authenticate the app (App Auth).

- **GET `/app/installations`**
  - List all installations for the app.

- **POST `/app/installations/:id`**
  - Generate an installation access token for the given installation ID.

- **GET `/app/installations/get/:id`**
  - Verify installation ID.

---

## Repository Endpoints

- **GET `/app/:owner/:repo/contents`**
  - Get repository contents (workflows, etc).

- **GET `/app/:owner/:repo/variables`**
  - Get repository secrets/variables (alerts).

- **POST `/app/:owner/:repo/fixalerts`**
  - Generate an autofix for a code scanning alert.

- **POST `/app/:owner/:repo/fix_alerts`**
  - Generate autofixes and open a pull request for alerts.

- **GET `/app/:owner/:repo/has-webhook`**
  - Check if the repository has a webhook installed.

- **POST `/app/:owner/:repo/enable-dependabot`**
  - Enable Dependabot for the repository (smart enable).

---

## User Endpoints

- **GET `/app/user/:userLogin/installations`**
  - Get all installations and repositories for a user.

---

## Webhook Endpoint

- **POST `/webhook`**
  - GitHub webhook endpoint (raw JSON, used for event handling).

---

## Notes
- All endpoints are relative to your backend base URL (e.g., `http://localhost:3000`).
- Some endpoints require authentication or specific headers.
- For POST endpoints, refer to controller logic for required body parameters.

---

For more details on request/response formats, see the corresponding controller files or ask for examples.
