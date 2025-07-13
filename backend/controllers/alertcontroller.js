import fs from 'fs';
import { Install_process } from '../services/githubService.js';
import { InvisioFlow } from '../services/WorkflowService.js';
import { OpenAIService } from '../services/provider_openai.js';
import { extractCodeBlock, formatJavaScript } from '../services/formatter.js';

const openAIService = new OpenAIService();

// Helper function to get the autofix code block
async function getAutofixCode(owner, repo, alert) {
  const workflowService = new InvisioFlow(owner);
  await workflowService.init();
  const { fault: codeSnippet, message: alertMessage } = await workflowService.get_fault_code(alert, repo);
  if (!codeSnippet || !alertMessage) return null;
  const fix = await openAIService.generate_fix(alertMessage, codeSnippet);
  const cleaned = await openAIService.deduplicate_fix(fix);
  const formatted = await formatJavaScript(cleaned);
  return await extractCodeBlock(formatted);
}

/**
 * Get code scanning alerts for a repository.
 */
export const getRepoAlerts = async (req, res, next) => {
  const { owner, repo } = req.params;
  try {
    const obj = new InvisioFlow(owner);
    await obj.init();
    const data = await obj.get_alerts(repo);
    res.json(data);
  } catch (error) {
    console.log('Failure', error);
    // Pass error to centralized error handler
    next(error);
  }
};


/**
 * Generate an autofix for a given alert.
 */
export const generateAutofix = async (req, res) => {
  const { owner, repo } = req.params;
  const alert = req.body;

  if (!alert) {
    return res.status(400).json({ error: 'Alert data is required in request body' });
  }

  try {
    const codeBlock = await getAutofixCode(owner, repo, alert);

    if (!codeBlock) return res.status(400).json({ error: 'Failed to retrieve code snippet or alert message' });

    res.json({ codeBlock });

  } catch (error) {
    console.error('Error generating autofix:', error);
    res.status(500).json({ error: 'Failed to generate autofix' });
  }
};


/**
 * Generate autofixes and create a pull request.
 */
export const generateAutofixesPullRequest = async (req, res) => {
  const { owner, repo } = req.params;
  try {
    const workflowService = new InvisioFlow(owner);
    await workflowService.init();
    
    const alerts = await workflowService.get_alerts(repo);
    // Support both array and single alert
    const openAlerts = Array.isArray(alerts) ? alerts.filter(a => a.state === "open") : (alerts && alerts.state === "open" ? [alerts] : []);
    if (!openAlerts.length) {
      console.log("No open alerts for autofix.");
      return res.json({ message: "No open alerts for autofix." });
    }
    const openaler=openAlerts.slice(0,2);
    const branchRef = "refs/heads/autofixes";
    await workflowService.create_new_branch(repo, branchRef);
    const codeBlocks = [];
    for (const alert of openaler) {
      const codeBlock = await getAutofixCode(owner, repo, alert);
      codeBlocks.push({ alert, codeBlock });
      await workflowService.create_commit(
        repo,
        branchRef,
        alert.most_recent_instance.location.path,
        codeBlock,
        `Autofix commit for alert #${alert.number || ''} from AI`
      );
    }
    // Open a single pull request for all alerts
    if (codeBlocks.length === 0) {
      return res.json({ message: "No autofixes generated." });
    }
    const repoData= await workflowService.get_repo_info(repo);
    if(!repoData || !repoData.default_branch) {
      return res.status(404).json({ error: "Repository not found or default branch missing." });
    }
    const prBody = codeBlocks.map(({ alert, codeBlock }) =>
      `### Alert: ${alert.rule.description || 'N/A'}\n` +
      `**File:** ${alert.most_recent_instance.location.path || 'N/A'}\n` +
      `**Alert URL:** ${alert.html_url || 'N/A'}\n` +
      '```js\n' + codeBlock + '\n```\n'
    ).join('\n---\n');
    const pr = await workflowService.open_pull_request(
      repo,
      repoData.default_branch,
      'autofixes',
      { rule: { description: 'Batch autofix for multiple alerts' }, html_url: '', most_recent_instance: { location: { path: '' } }, prBody }
    );
    res.json({ codeBlocks, pullRequest: pr });
  } catch (error) {
    res.status(500).json({ error: "Unstable command" });
  }
};
/**
 * Enable smart Dependabot config for a repository.
 */
export const enableSmartDependabot = async (req, res, next) => {
  const { owner, repo } = req.params;
  try {
    const workflowService = new InvisioFlow(owner);
    await workflowService.init();
    const result = await workflowService.smartEnableDependabot(repo);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Failed to enable smart Dependabot:', error);
    next(error);
  }
};
