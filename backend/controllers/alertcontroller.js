import fs from "fs";
import { Install_process } from "../services/githubService.js";
import { InvisioFlow } from "../services/WorkflowService.js";
import { OpenAIService } from "../services/provider_openai.js";
import {
  extractCodeBlock,
  formatJavaScript,
  parseAIFixResponse,
} from "../services/formatter.js";
import { callWithRetry } from "../services/retry.js";
import { DeepSeekService } from "../services/provider_deepseek.js";
import { GeminiService } from "../services/provider_gemini.js";
import { diffLines } from "diff";
import {
  initWorkflowService,
  getOpenAlerts,
  createOrGetBranch,
  processAlert,
  generatePRBody,
  openPullRequest,
} from "./automaters.js";
import { get } from "http";
const openAIService = new GeminiService();

// Helper function to get the autofix code block
function normalizeLanguage(lang) {
  if (!lang) return "unknown";

  const l = lang.toLowerCase();

  if (l.includes("javascript")) return "javascript";
  if (l.includes("typescript")) return "typescript";
  if (l.includes("python")) return "python";

  return "unknown";
}
export async function getAutofixCode(owner, repo, alert) {
  const workflowService = new InvisioFlow(owner);
  await workflowService.init();
  const env = JSON.parse(alert.most_recent_instance.environment);
  const rawLang = env.language; // e.g. "javascript-typescript"
  const lang = normalizeLanguage(rawLang);
  // 1. Extract code and metadata from repo based on the alert
  const faultData = await workflowService.get_fault_code(alert, repo);
  if (!faultData?.snippet) return null;

  // 2. Generate structured fix using the AI model (with retries)
  const aiOutput = await callWithRetry(
    openAIService.generate_fix,
    [faultData.message, faultData.snippet, faultData.vulinfo , lang],
    3 // max retries
  );

  // 3. Parse AI output into structured parts
  const { before, after, dependencies, explanation } = aiOutput;

  // 4. Deduplicate only the "After" code (with retries)
  const dedupedAfter = await callWithRetry(
    openAIService.deduplicate_fix,
    [{ fix: after }],
    3 // max retries
  );

  // 5. Format the JavaScript code
  const formattedAfter = await formatJavaScript(dedupedAfter);

  // 6. Extract pure code without any Markdown fence
  const cleanCode = await extractCodeBlock(formattedAfter);

  // 7. Return structured result for further patching
  return {
    before,
    after: cleanCode,
    dependencies,
    explanation,
  };
}

export function applyAutofixRobust(fullFile, snippetStartLine, before, after) {
  const fileLines = fullFile.split("\n");
  const beforeLines = before.split("\n");
  const currentSegmentLines = fileLines.slice(
    snippetStartLine - 1,
    snippetStartLine - 1 + beforeLines.length
  );
  const currentSegment = currentSegmentLines.join("\n");

  const diff = diffLines(
    before.replace(/\r/g, ""),
    currentSegment.replace(/\r/g, "")
  );
  const hasMismatch = diff.some((part) => part.added || part.removed);
  if (hasMismatch) {
    const fullFileStr = fileLines.join("\n");

    function escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    let firstFewBeforeLines = beforeLines.slice(0, 3).join("\n");
    const beforeSnippetRegex = new RegExp(
      escapeRegex(firstFewBeforeLines),
      "m"
    );
    const match = beforeSnippetRegex.exec(fullFileStr);

    if (match) {
      snippetStartLine =
        (fullFileStr.slice(0, match.index).match(/\n/g) || []).length + 1;
    } else {
      fileLines.splice(snippetStartLine - 1, 0, ...after.split("\n"));
      return fileLines.join("\n");
    }
  }

  const mergedSegments = [];
  const beforeLinesArr = before.split("\n");
  const patchDiff = diffLines(before, after);

  patchDiff.forEach((part) => {
    if (part.added) {
      mergedSegments.push(...part.value.split("\n").filter((l) => l !== ""));
    } else if (!part.removed) {
      mergedSegments.push(...part.value.split("\n").filter((l) => l !== ""));
    }
  });

  fileLines.splice(
    snippetStartLine - 1,
    beforeLinesArr.length,
    ...mergedSegments
  );

  return fileLines.join("\n");
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
    console.log("Failure", error);
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
    return res
      .status(400)
      .json({ error: "Alert data is required in request body" });
  }

  try {
    const codeBlock = await getAutofixCode(owner, repo, alert);

    if (!codeBlock)
      return res
        .status(400)
        .json({ error: "Failed to retrieve code snippet or alert message" });

    res.json({ codeBlock });
  } catch (error) {
    console.error("Error generating autofix:", error);
    res.status(500).json({ error: "Failed to generate autofix" });
  }
};

/**
 * Generate autofixes and create a pull request.
 */
// export const generateAutofixesPullRequest = async (req, res) => {
//   const { owner, repo } = req.params;
//   try {
//     const workflowService = new InvisioFlow(owner);
//     await workflowService.init();
//     const alerts = await workflowService.get_alerts(repo);
//     const openAlerts = Array.isArray(alerts) ? alerts.filter(a => a.state === "open") : (alerts && alerts.state === "open" ? [alerts] : []);
//     if (!openAlerts.length) return res.json({ message: "No open alerts for autofix." });
//     const openaler=openAlerts.slice(0,2);
//     const branchRef = "refs/heads/autofixes";
//     await workflowService.create_new_branch(repo, branchRef);
//     const codeBlocks = [];
//     for (const alert of openaler) {
//       const codeBlock = await getAutofixCode(owner, repo, alert);
//       codeBlocks.push({ alert, codeBlock });
//       await workflowService.create_commit(
//         repo,
//         branchRef,
//         alert.most_recent_instance.location.path,
//         codeBlock,
//         `Autofix commit for alert #${alert.number || ''} from AI`
//       );
//     }
//     // Open a single pull request for all alerts
//     if (codeBlocks.length === 0) {
//       return res.json({ message: "No autofixes generated." });
//     }
//     const repoData= await workflowService.get_repo_info(repo);
//     if(!repoData || !repoData.default_branch) {
//       return res.status(404).json({ error: "Repository not found or default branch missing." });
//     }
//     const prBody = codeBlocks.map(({ alert, codeBlock }) =>
//       `### Alert: ${alert.rule.description || 'N/A'}\n` +
//       `**File:** ${alert.most_recent_instance.location.path || 'N/A'}\n` +
//       `**Alert URL:** ${alert.html_url || 'N/A'}\n` +
//       '```js\n' + codeBlock + '\n```\n'
//     ).join('\n---\n');
//     const pr = await workflowService.open_pull_request(
//       repo,
//       repoData.default_branch,
//       'autofixes',
//       { rule: { description: 'Batch autofix for multiple alerts' }, html_url: '', most_recent_instance: { location: { path: '' } }, prBody }
//     );
//     res.json({ codeBlocks, pullRequest: pr });
//   } catch (error) {
//     res.status(500).json({ error: "Unstable command" });
//   }
// };

export const generateAutofixesPullRequest = async (req, res) => {
  const { owner, repo } = req.params;

  try {
    const workflowService = await initWorkflowService(owner);
    // Get open alerts in repo
    const openAlerts = await getOpenAlerts(workflowService, repo);
    if (!openAlerts.length)
      return res.json({ message: "No open alerts for autofix." });

    // Limit to first 2 alerts for now
    const selectedAlerts = openAlerts.slice(0, 2);

    // 2. Create a new branch for fixes
    const branchRef = "refs/heads/autofixes";
    const branchCreated = await createOrGetBranch(
      workflowService,
      repo,
      branchRef
    );

    const codeBlocks = [];

    for (const alert of selectedAlerts) {
      const process = await processAlert(workflowService, repo, alert);
      if (process) codeBlocks.push(process);
    }

    // 3. If no commits, return
    if (!codeBlocks.length) {
      return res.json({ message: "No autofixes generated." });
    }

    // 4. Get repo info (for default branch)
    const repoData = await workflowService.get_repo_info(repo);
    if (!repoData || !repoData.default_branch) {
      return res
        .status(404)
        .json({ error: "Repository not found or default branch missing." });
    }

    // 5. Create PR body with explanation + snippet
    const prBody = await generatePRBody(codeBlocks);

    // 6. Open a PR
    const pr = await openPullRequest(
      workflowService,
      repo,
      repoData.default_branch,
      "autofixes",
      prBody
    );
    res.json({ codeBlocks, pullRequest: prBody });
  } catch (error) {
    console.error("Error creating autofix PR:", error);
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
    console.error("Failed to enable smart Dependabot:", error);
    next(error);
  }
};
