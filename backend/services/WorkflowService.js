import { Octokit } from "@octokit/rest";
import { Install_process } from "./githubService.js";
import { CommitFlow } from "./code-scanning.js";
import { commitDependabotYML } from "./dependabot.js";
import { Gitleakscommit } from "./gitleaks.js";

export const InvisioFlow = class Envison {
  constructor(owner, installationId) {
    this.owner = owner;
    this.installationId = installationId;
    this.octokit = null;
  }

  async init() {
    try {
      const handler = new Install_process(this.installationId);
      const installToken = await handler.create_instance(this.owner);
      this.octokit = new Octokit({ auth: installToken });
      console.log("Octokit initialized.");
    } catch (e) {
      console.error("Failed to init Octokit:", e.message);
      throw e;
    }
  }
  async get_repo_info(repo) {
    try {
      const response = await this.octokit.request("GET /repos/{owner}/{repo}", {
        owner: this.owner,
        repo: repo,
      });
      return response.data;
    } catch (e) {
      console.error("Error fetching repository info:", e.message);
      throw e;
    }
  }

  async checkflow(repo) {
    try {
      const { data } = await this.octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          owner: this.owner,
          repo: repo,
          path: ".github/workflows",
        }
      );
      return data;
    } catch (e) {
      if (e.status === 404) {
        console.log("Workflows folder missing. Committing default workflow.");
        await CommitFlow(this.octokit, this.owner, repo);
        await Gitleakscommit(this.octokit, this.owner, repo);
        console.log("Default workflows committed successfully.");
        return;
      }
      console.error("Error checking workflows:", e.message);
      throw e;
    }
  }
  async get_alerts(repo) {
    try {
      const { data } = await this.octokit.request(
        "GET /repos/{owner}/{repo}/code-scanning/alerts",
        {
          owner: this.owner,
          repo: repo,
        }
      );
      return data;
    } catch (e) {
      console.error("Error fetching alerts:", e.message);
      throw e;
    }
  }
  // async get_fault_code(alert, repo) {
  // const file = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
  //     owner: this.owner,
  //     repo: repo,
  //     path: alert.most_recent_instance.location.path,
  //     ref: alert.most_recent_instance.ref,
  // });

  // const content = Buffer.from(file.data.content, "base64").toString("utf-8");
  // const lines = content.split("\n");
  // return {
  //     fault: lines,
  //     message: alert.rule.help,
  // };
  async get_fault_code(alert, repo) {
    const { data } = await this.octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner: this.owner,
        repo,
        path: alert.most_recent_instance.location.path,
        ref: alert.most_recent_instance.ref,
      }
    );

    const lines = Buffer.from(data.content, "base64")
      .toString("utf-8")
      .split("\n");
    const {
      start_line,
      end_line = start_line,
      path,
    } = alert.most_recent_instance.location;
    const context = 3;

    const snippetStart = Math.max(0, start_line - context - 1);
    const snippetEnd = Math.min(lines.length, end_line + context);
    const snippet = lines.slice(snippetStart, snippetEnd);

    snippet.splice(start_line - snippetStart - 1, 0, "// AI FIX START");
    snippet.splice(end_line - snippetStart + 1, 0, "// AI FIX END");

    return {
      fullFile: lines.join("\n"),
      snippet: snippet.join("\n"),
      snippetStartLine: snippetStart + 1,
      message: alert.most_recent_instance.message.text +"\n"+ alert.tool.name,
      filePath: path,
      vulinfo:alert.rule.help,
    };
  }
  async get_commit_sha(repo) {
    try {
      const { data: commits } = await this.octokit.request(
        "GET /repos/{owner}/{repo}/commits",
        {
          owner: this.owner,
          repo: repo,
          per_page: 2, // Fe  tch only 2 to get the second-to-last
        }
      );
      if (commits.length < 2) throw new Error("Not enough commits.");
      return commits[0].sha;
    } catch (e) {
      console.error("Error getting commit SHA:", e.message);
      throw e;
    }
  }

  async create_new_branch(repo, branchRef) {
    try {
      // Check if the branch already exists
      await this.octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
        owner: this.owner,
        repo: repo,
        ref: branchRef.replace("refs/", ""), // API expects 'heads/branchName'
      });
      console.log(
        `Branch '${branchRef.replace("refs/heads/", "")}' already exists. Using existing branch.`
      );
      return { branchExisted: true, branch: branchRef };
    } catch (e) {
      if (e.status === 404) {
        // Branch does not exist, create it from the latest commit on 'main'
        const baseSha = await this.get_commit_sha(repo, "main");
        try {
          const { data } = await this.octokit.request(
            "POST /repos/{owner}/{repo}/git/refs",
            {
              owner: this.owner,
              repo: repo,
              ref: branchRef,
              sha: baseSha,
            }
          );
          console.log(
            `Branch '${branchRef.replace("refs/heads/", "")}' created successfully.`
          );
          return { branchExisted: false, branch: branchRef, data };
        } catch (createError) {
          // If branch already exists due to race condition, treat as success
          if (
            createError.status === 422 &&
            createError.message &&
            createError.message.includes("Reference already exists")
          ) {
            console.log(
              `Branch '${branchRef.replace("refs/heads/", "")}' already exists (422). Using existing branch.`
            );
            return { branchExisted: true, branch: branchRef };
          }
          console.error("Error creating new branch:", createError.message);
          throw createError;
        }
      } else {
        console.error(
          "Unexpected error when checking for branch existence:",
          e.message
        );
        console.log(
          `Proceeding to use branch '${branchRef.replace("refs/heads/", "")}' despite error.`
        );
        return { branchExisted: "unknown", branch: branchRef, error: e };
      }
    }
  }
  async open_pull_request(repo, base, head,alert = null) {
    try {
      let body;
      if (alert?.prBody) {
        body=alert.prBody; // use the preformatted multi-alert body
      } else if (alert) {
        body =
          `Automated fix for code scanning alert:\n\n` +
          `**Rule:** ${alert.rule?.description || "N/A"}\n` +
          `**Alert Message:** ${alert.rule?.help || "N/A"}\n` +
          `**File:** ${alert.most_recent_instance?.location?.path || "N/A"}\n` +
          `**Alert URL:** ${alert.html_url || "N/A"}`;
      } else {
        body = "Automated fix generated by Invisio.";
      }
      const { data } = await this.octokit.request(
        "POST /repos/{owner}/{repo}/pulls",
        {
          owner: this.owner,
          repo,
          title: "Automated Code Scanning Fixes",
          head,
          base,
          body,
        }
      );

      console.log(`Pull request opened: ${data.html_url}`);
      return data;
    } catch (e) {
      console.error("Error opening pull request:", e.message);
      throw e;
    }
  }
  

  // async open_pull_request(repo, base, head, alert = null) {
  //     try {
  //         let body = undefined;
  //         if (alert) {
  //             // Compose a body from alert info (customize as needed)
  //             body = `Automated fix for code scanning alert:\n\n` +
  //                 `**Rule:** ${alert.rule?.description || 'N/A'}\n` +
  //                 `**Alert Message:** ${alert.rule?.help || 'N/A'}\n` +
  //                 `**File:** ${alert.most_recent_instance?.location?.path || 'N/A'}\n` +
  //                 `**Alert URL:** ${alert.html_url || 'N/A'}`;
  //         }
  //         const { data } = await this.octokit.request('POST /repos/{owner}/{repo}/pulls', {
  //             owner: this.owner,
  //             repo: repo,
  //             title: 'Automated Code Scanning Fixes',
  //             head: head,
  //             base: base,
  //             body: body,
  //         });
  //         console.log(`Pull request opened: ${data.html_url}`);
  //         return data;
  //     } catch (e) {
  //         console.error('Error opening pull request:', e.message);
  //         throw e;
  //     }
  // }
  async create_commit(
    repo,
    branchRef,
    filePath,
    content,
    commitMessage = "This is a fix"
  ) {
    try {
      // Fetch the latest file SHA
      const { data: fileData } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: repo,
        path: filePath,
        ref: branchRef,
      });

      const latestSha = fileData.sha;

      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: repo,
        path: filePath,
        message: commitMessage,
        content: Buffer.from(content).toString("base64"),
        branch: branchRef,
        sha: latestSha, // Use the latest SHA here
      });
      return response;
    } catch (error) {
      console.log("An error occurred while committing", error);
      throw error;
    }
  }
  async dismiss_alert(
    repo,
    alertNumber,
    reason = "fixed",
    dismissedBy = "Invisiotec",
    dismissedComment = "Fixed by Invisiotec via PR"
  ) {
    try {
      const { data } = await this.octokit.request(
        "PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
        {
          owner: this.owner,
          repo: repo,
          alert_number: alertNumber,
          state: "dismissed",
          dismissed_reason: reason,
          dismissed_comment: dismissedComment,
        }
      );
      console.log(
        `Alert #${alertNumber} dismissed as fixed by ${dismissedBy}.`
      );
      return data;
    } catch (e) {
      console.error(`Error dismissing alert #${alertNumber}:`, e.message);
      throw e;
    }
  }
  async hasWebhook(repo, webhookUrl) {
    try {
      const { data: hooks } = await this.octokit.request(
        "GET /repos/{owner}/{repo}/hooks",
        {
          owner: this.owner,
          repo: repo,
        }
      );
      return hooks.some(
        (hook) => hook.config && hook.config.url === webhookUrl
      );
    } catch (e) {
      if (e.status === 404) {
        console.log("No webhooks found for this repo.");
        return false;
      }
      console.error("Error checking webhooks:", e.message);
      throw e;
    }
  }
  async getPullDetails(repo, prNumber) {
    try {
      const { data } = await this.octokit.request(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}",
        {
          owner: this.owner,
          repo: repo,
          pull_number: prNumber,
        }
      );
      return data;
    } catch (error) {
      console.error("Error fetching pull request details:", error.message);
      throw error;
    }
  }
  async get_pull_request(repo) {
    try {
      const { data } = await this.octokit.request(
        "GET /repos/{owner}/{repo}/pulls",
        {
          owner: this.owner,
          repo: repo,
          state: "open",
          per_page: 1,
        }
      );
      return data;
    } catch (error) {
      console.error("Error fetching pull request:", error.message);
      throw error;
    }
  }
  async smartEnableDependabot(repo) {
    if (!this.octokit) throw new Error("Octokit not initialized");
    // Check if dependabot.yml already exists
    try {
      await this.octokit.repos.getContent({
        owner: this.owner,
        repo: repo,
        path: ".github/dependabot.yml",
      });
      console.log("Dependabot config already exists for", repo);
      return { alreadyEnabled: true };
    } catch (e) {
      if (e.status !== 404) throw e; // Only proceed if not found
    }
    await commitDependabotYML(this.octokit, this.owner, repo);
    console.log("Smart Dependabot config committed for", repo);
    return { success: true };
  }
};
