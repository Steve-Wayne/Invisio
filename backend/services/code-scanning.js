import yaml from 'js-yaml';
import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';
import { App } from '@octokit/app';

dotenv.config();

const CODEQL_LANGUAGES = {
  'C': 'c-cpp',
  'C++': 'c-cpp',
  'C#': 'csharp',
  'Go': 'go',
  'Java': 'java-kotlin',
  'Kotlin': 'java-kotlin',
  'JavaScript': 'javascript-typescript',
  'TypeScript': 'javascript-typescript',
  'Python': 'python',
  'Ruby': 'ruby',
  'Swift': 'swift'
};

export const GetStaticWorkflow = async (octokit) => {
  const response = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
    owner: process.env.OWNER,
    repo: process.env.REPO,
    path: 'code-scanning/codeql.yml',
  });
  const content_64 = response.data.content;
  const content_utf8 = Buffer.from(content_64, 'base64').toString('utf-8');
  return content_utf8;
};

export const get_values = async (octokit, owner, repo) => {
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: protectedBranchesData } = await octokit.repos.listBranches({
    owner,
    repo,
    protected: true,
  });
  const protectedBranches = protectedBranchesData.map(branch => branch.name);

  const { data: languageData } = await octokit.repos.listLanguages({ owner, repo });
  const detected_languages = Object.keys(languageData)
    .filter(l => CODEQL_LANGUAGES[l])
    .map(l => CODEQL_LANGUAGES[l]);
  const uniqueLanguages = [...new Set(detected_languages)];

  const codeqlLanguagesMatrix = {
    language: uniqueLanguages
  };

  const cronWeekly = "0 0 * * 0"; // every Sunday at 00:00 UTC

  return {
    defaultBranch,
    protectedBranches,
    codeqlLanguagesMatrix,
    cronWeekly,
  };
};

export const InjectVars = async (values, staticyml) => {
  const yamlObject = yaml.load(staticyml);

  const {
    defaultBranch,
    protectedBranches,
    codeqlLanguagesMatrix,
    cronWeekly
  } = values;

  const branches = [defaultBranch, ...(Array.isArray(protectedBranches) ? protectedBranches : [])];

  if (yamlObject.on?.push) yamlObject.on.push.branches = [...branches];
  if (yamlObject.on?.pull_request) yamlObject.on.pull_request.branches = [...branches];
  if (yamlObject.on?.schedule) yamlObject.on.schedule = [{ cron: cronWeekly }];

  if (yamlObject.jobs?.analyze?.strategy) {
    const detectedLanguages = codeqlLanguagesMatrix.language;

    const includeMatrix = detectedLanguages.map(lang => ({
      language: lang,
      "build-mode": "none"
    }));

    includeMatrix.push({
      language: "actions",
      "build-mode": "none"
    });

    yamlObject.jobs.analyze.strategy.matrix = { include: includeMatrix };
  }

  return yaml.dump(yamlObject, { lineWidth: 160, noRefs: true });
};

export const CommitFlow = async (octokit, owner, repo) => {
  const staticyml = await GetStaticWorkflow(octokit);
  const values = await get_values(octokit, owner, repo);
  const defbranch = values.defaultBranch;
  const dynamicyml = await InjectVars(values, staticyml);

  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner: owner,
    repo: repo,
    path: '.github/workflows/codeql.yml',
    message: "Add CodeQL workflow",
    content: Buffer.from(dynamicyml, 'utf-8').toString('base64'),
    branch: defbranch,
  });

  console.log(" Commit Successful");
};