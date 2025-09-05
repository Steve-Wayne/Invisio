import { InvisioFlow } from '../services/WorkflowService.js';
import { GeminiService } from '../services/provider_gemini.js';
import { generateAutofixesPullRequest } from './alertcontroller.js';
import { applyAnalysisResults , initWorkflowService } from './automaters.js';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export const handleWorkflowFailure = async (payload) => {
  const status = payload.workflow_run?.status || payload.workflow_job?.status;
  const conclusion = payload.workflow_run?.conclusion || payload.workflow_job?.conclusion;
  if (status === 'completed' && conclusion === 'failure') {
    try {
      const repo = payload.repository.name;
      const owner = payload.repository.owner.login;
      const installationId = payload.installation?.id;
      const workflowService = new InvisioFlow(owner, installationId);
      await workflowService.init();
      const title = `[Automated] Workflow ${payload.workflow_run ? 'workflow_run' : 'workflow_job'} failed: ${payload.workflow_run?.name || payload.workflow_job?.name}`;
      const body = `A workflow has failed.\n\n- Workflow: ${payload.workflow_run?.name || payload.workflow_job?.name}\n- Status: ${status}\n- Conclusion: ${conclusion}\n- URL: ${payload.workflow_run?.html_url || payload.workflow_job?.html_url}`;
      await workflowService.octokit.issues.create({
        owner,
        repo,
        title,
        body
      });
      console.log('Created issue for failed workflow/job.');
    } catch (err) {
      console.error('Error creating issue for failed workflow/job:', err);
    }
  }
};

export const handleInstallationEvent = async (payload) => {
  const repos = payload.repositories || payload.repositories_added || [];
  const installationId = payload.installation?.id;
  if (!installationId) throw new Error('Missing installation id');
  for (const repoObj of repos) {
    let owner, repo;
    if (repoObj.full_name) {
      [owner, repo] = repoObj.full_name.split('/');
    } else {
      owner = payload.installation?.account?.login;
      repo = repoObj.name;
    }
    if (!owner || !repo) continue;
    try {
      const workflowService = new InvisioFlow(owner, installationId);
      await workflowService.init();
      await workflowService.checkflow(repo);
      await workflowService.smartEnableDependabot(repo);
    } catch (err) {
      console.error(`Error processing repo ${owner}/${repo}:`, err.message);
    }
  }
  console.log('Processed installation event for repos:', repos.map(r => r.full_name || `${r.owner?.login}/${r.name}`));
};

export const handlePullRequestEvent = async (payload) => {
  // Only analyze on PR opened, reopened, or synchronized (updated)
  if (!['opened', 'reopened', 'synchronize'].includes(payload.action)) return;
  try {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const prNumber = payload.number;
    const prTitle = payload.pull_request?.title || '';
    const prBody = payload.pull_request?.body || '';
    // Get the PR diff
    const installationId = payload.installation?.id;
    const workflowService = await initWorkflowService(owner, installationId);
    const { data: diff } = await workflowService.octokit.pulls.get({ owner, repo, pull_number: prNumber });
    const prDiff = diff.diff_url ? (await (await fetch(diff.diff_url)).text()) : '';
    // Analyze PR with Gemini
    const gemini = new GeminiService();
    const analysis = await gemini.analyze_pr(prTitle, prBody, prDiff);
    // Add labels if any
    await applyAnalysisResults(workflowService, { owner, repo, prNumber }, analysis);
    console.log('PR analyzed and suggestions posted.');
  } catch (e) {
    console.error('Error handling pull_request event with Gemini:', e);
  }
}

// Auto-rebase handler for PRs behind base branch
export const handleAutoRebasePR = async (payload) => {
  if (!['opened', 'synchronize'].includes(payload.action)) return;
  try {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const prNumber = payload.number;
    const base = payload.pull_request.base.ref;
    const head = payload.pull_request.head.ref;
    const installationId = payload.installation?.id;
    const workflowService = new (await import('../services/WorkflowService.js')).InvisioFlow(owner, installationId);
    await workflowService.init();
    // Compare base and head
    const { data: comparison } = await workflowService.octokit.repos.compareCommits({
      owner,
      repo,
      base,
      head
    });
    if (comparison.status === 'behind') {
      // Post a comment offering to rebase
      await workflowService.octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: `This pull request is behind \
\`${base}\`. Would you like me to rebase it for you? React with 👍 to proceed.`
      });
      console.log(`PR #${prNumber} is behind ${base}. Offer to rebase posted.`);
    } else {
      console.log(`PR #${prNumber} is up to date with ${base}. No action needed.`);
    }
  } catch (err) {
    console.error('Error in auto-rebase handler:', err);
  }
};

/**
 * Attempts to auto-resolve merge conflicts in a PR using Gemini AI.
 * @param {object} params - { owner, repo, prNumber, base, head, installationId, octokit }
 */
export async function resolveMergeConflictsWithAI({ owner, repo, prNumber, base, head, installationId, octokit }) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pr-rebase-'));
  const git = simpleGit(tmpDir);
  try {
    // 1. Clone repo
    const repoUrl = `https://x-access-token:${process.env.GITHUB_APP_TOKEN}@github.com/${owner}/${repo}.git`;
    await git.clone(repoUrl, tmpDir);
    await git.cwd(tmpDir);
    // 2. Fetch and checkout PR branch
    await git.fetch('origin', head);
    await git.checkout(head);
    // 3. Fetch and merge base
    await git.fetch('origin', base);
    try {
      await git.merge([`origin/${base}`]);
    } catch (mergeErr) {
      // 4. If conflicts, resolve with Gemini
      const status = await git.status();
      for (const file of status.conflicted) {
        const filePath = path.join(tmpDir, file);
        let content = await fs.readFile(filePath, 'utf8');
        // Call Gemini to resolve conflict
        const gemini = new GeminiService();
        const resolved = await gemini.resolveConflict(file, content);
        await fs.writeFile(filePath, resolved, 'utf8');
        await git.add(file);
      }
      await git.commit('Resolve merge conflicts using Gemini AI');
    }
    // 5. Push updated PR branch
    await git.push('origin', head);
    // 6. Comment on PR
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: 'Conflicts resolved via AI. Please review the changes.'
    });
    console.log(`Conflicts resolved and branch pushed for PR #${prNumber}`);
  } catch (err) {
    console.error('Error during AI conflict resolution:', err);
    throw err;
  } finally {
    // Clean up temp dir
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}


export const handleCheckRunEvent = async (payload) => {
  console.log("Received check_run event:", payload.action);

  if (
    payload.action === "completed" &&
    payload.check_run.name.toLowerCase().includes("codeql") &&
    payload.check_run.conclusion === "success"
  ) {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const sha = payload.check_run.head_sha;

    const fakeReq = {
      params: { owner, repo },
      body: payload,
    };

    const fakeRes = {
      json: (data) => console.log("Autofix Success:", data),
      status: (code) => ({
        json: (msg) => console.error(`Autofix Error ${code}:`, msg),
      }),
    };

    const fakeNext = (err) => {
      if (err) console.error("Unhandled error in autofix flow:", err);
    };

    try {
      await generateAutofixesPullRequest(fakeReq , fakeRes);
    } catch (err) {
      console.error("Error running generateAutofix:", err.message);
    }
  } else {
    console.log("Ignored check_run event — not a successful CodeQL run.");
  }
};
