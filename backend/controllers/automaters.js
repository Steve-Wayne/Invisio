import { InvisioFlow } from "../services/WorkflowService.js";
import {getAutofixCode , generateAutofix, applyAutofixRobust} from "./alertcontroller.js";

// Initialize workflow service for a repo owner / installation id
 export async function initWorkflowService(owner, installationId) {
  const workflowService = new InvisioFlow(owner, installationId);
  await workflowService.init();
  return workflowService;
}

// Fetch and filter open alerts for the repo
export async function getOpenAlerts(workflowService, repo) {
  const alerts = await workflowService.get_alerts(repo);
  if (!alerts) return [];
  if (Array.isArray(alerts))
    return alerts.filter(a => a.state === "open");
  if (alerts.state === "open")
    return [alerts];
  return [];
}

// Create or reuse a branch for autofixes
export async function createOrGetBranch(workflowService, repo, branchRef) {
  return await workflowService.create_new_branch(repo, branchRef);
}

// Process a single alert: get fault code, generate and apply fix, commit
export async function processAlert(workflowService, repo, alert) {
  const faultData = await workflowService.get_fault_code(alert, repo);
  const fixData = await getAutofixCode(
    workflowService.owner,
    repo,
    alert
  );
  if (!fixData?.after) {
    console.log(`No fix generated for alert #${alert.number}`);
    return null;
  }
  let patchedFile;
  try {
    patchedFile = applyAutofixRobust(
      faultData.fullFile,
      faultData.snippetStartLine,
      fixData.before,
      fixData.after
    );
  } catch (err) {
    console.error(`Patch failed for alert #${alert.number}: ${err.message}`);
    return null;
  }
  await workflowService.create_commit(
    repo,
    "refs/heads/autofixes",
    faultData.filePath,
    patchedFile,
    `Autofix commit for alert #${alert.number || ''} from AI`
  );
  return { alert, fixData };
}

// Format PR body string from fixes array
export function generatePRBody(codeBlocks) {
  return codeBlocks.map(({ alert, fixData }) =>
    `### Alert: ${alert.rule.description || 'N/A'}\n` +
    `**File:** ${alert.most_recent_instance.location.path || 'N/A'}\n` +
    `**Alert URL:** ${alert.html_url || 'N/A'}\n` +
    `**Explanation:** ${fixData.explanation || 'N/A'}\n` +
    '``````'
  ).join('\n---\n');
}

// Open pull request on GitHub
 export async function openPullRequest(workflowService, repo, baseBranch, newBranch, prBody) {
  return await workflowService.open_pull_request(
    repo,
    baseBranch,
    newBranch,
    { prBody }
  );
}
// function to apply analysis results (labels, comments) to a PR
export async function applyAnalysisResults(workflowService, { owner, repo, prNumber }, analysis) {
  if (analysis.labels?.length > 0) {
    await workflowService.octokit.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: analysis.labels,
    });
  }

  if (analysis.comment) {
    await workflowService.octokit.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      body: analysis.comment,
      event: "COMMENT",
    });
  }
}

