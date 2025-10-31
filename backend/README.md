# Backend API Documentation

This document lists all available API endpoints for the backend service. Use these endpoints to integrate with the frontend or for testing purposes.

---

## Table of Contents

- [General App Endpoints](#general-app-endpoints)
- [Repository Endpoints](#repository-endpoints)
- [User Endpoints](#user-endpoints)
- [Webhook Endpoint](#webhook-endpoint)
- [Notes](#notes)

---

## General App Endpoints

- **GET `/app`**  
  Authenticate the app (App Auth).

- **GET `/app/installations`**  
  List all installations for the app.

- **POST `/app/installations/:id`**  
  Generate an installation access token for the given installation ID.

- **GET `/app/installations/get/:id`**  
  Verify installation ID.

---

## Repository Endpoints

- **GET `/app/:owner/:repo/contents`**  
  Get repository contents (workflows, files).

- **GET `/app/:owner/:repo/alerts`**  
  Get repository secrets/variables ("alerts").

- **POST `/app/:owner/:repo/generate_alert_fix`**  
  Generate an autofix for a code scanning alert (single alert).

- **POST `/app/:owner/:repo/fix_alerts_openpr`**  
  Generate autofixes for alerts and open a pull request.

- **GET `/app/:owner/:repo/has-webhook`**  
  Check if the repository has a webhook installed.

- **POST `/app/:owner/:repo/enable-dependabot`**  
  Enable Dependabot for the repository (smart enable).

- **GET `/app/:owner/:repo/pull`**  
  Get pull requests for the repository.

---

## User Endpoints

- **GET `/app/user/:userLogin/installations`**  
  Get all installations and repositories for a user.

---

## Webhook Endpoint

- **POST `/webhook`**  
  Receive GitHub webhooks (raw JSON payload; used for event handling).

---

## Notes

- All endpoints are relative to your backend base URL (e.g., `http://localhost:3000`).
- Some endpoints require authentication or specific headers (such as App Token or JWT).
- For POST endpoints, refer to the controller code for required body parameters.
- See corresponding controller files for detailed request and response formats, or ask for endpoint usage examples.

---
