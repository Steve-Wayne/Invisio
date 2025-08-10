import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();

export const GetStaticWorkflow = () => {
  return `name: gitleaks
on:
  push:
  pull_request:
  workflow_dispatch:
  schedule:
    - cron: "0 4 * * *"

jobs:
  scan:
    name: gitleaks
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install gitleaks
        run: |
          curl -sSfL https://github.com/gitleaks/gitleaks/releases/download/v8.18.4/gitleaks_8.18.4_linux_x64.tar.gz \\
            | tar -xz -C /usr/local/bin gitleaks
          chmod +x /usr/local/bin/gitleaks

      - name: Run gitleaks and output SARIF
        env:
          GITLEAKS_DISABLE_TELEMETRY: "true"
        run: |
          mkdir -p reports
          gitleaks detect --source . --report-format sarif --report-path reports/gitleaks.sarif || true

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: reports/gitleaks.sarif
`;
};

export const Gitleakscommit = async (octokit, owner, repo) => {
  const workflowContent = GetStaticWorkflow();

  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner,
    repo,
    path: '.github/workflows/gitleaks.yml',
    message: 'Add Gitleaks SARIF workflow',
    content: Buffer.from(workflowContent, 'utf-8').toString('base64'),
    branch: 'main', // change if default branch is different
  });

  console.log(' Gitleaks workflow committed successfully');
};

// Example usage:
// const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
// CommitFlow(octokit, 'your-org', 'your-repo');
