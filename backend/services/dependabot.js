import yaml from 'js-yaml';
import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';

dotenv.config();

// Map file indicators to package ecosystems
const DEPENDABOT_ECOSYSTEMS = {
  'package.json': 'npm',
  'yarn.lock': 'yarn',
  'requirements.txt': 'pip',
  'pyproject.toml': 'pip',
  'pom.xml': 'maven',
  'build.gradle': 'gradle',
  'build.gradle.kts': 'gradle',
  'Gemfile.lock': 'bundler',
  'go.mod': 'gomod',
  'Cargo.toml': 'cargo',
  'Dockerfile': 'docker',
  '.csproj': 'nuget',
  'mix.exs': 'mix',
  'Package.swift': 'swift',
  'main.tf': 'terraform',
};

export const detectEcosystems = async (octokit, owner, repo) => {
  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: 'HEAD',
    recursive: true,
  });

  const ecosystemSet = new Set();

  treeData.tree.forEach(item => {
    for (const [filename, ecosystem] of Object.entries(DEPENDABOT_ECOSYSTEMS)) {
      if (item.path.endsWith(filename)) {
        const directory = '/' + item.path.split('/').slice(0, -1).join('/');
        ecosystemSet.add(`${ecosystem}|${directory === '/' ? '/' : directory}`);
      }
    }
  });

  // Always add github-actions
  ecosystemSet.add('github-actions|/.github/workflows');

  return Array.from(ecosystemSet).map(entry => {
    const [eco, dir] = entry.split('|');
    return {
      'package-ecosystem': eco,
      directory: dir,
      schedule: { interval: 'weekly' }
    };
  });
};

export const buildDependabotYML = (updates) => {
  return yaml.dump({
    version: 2,
    updates
  }, { lineWidth: 160, noRefs: true });
};

export const commitDependabotYML = async (octokit, owner, repo) => {
  const updates = await detectEcosystems(octokit, owner, repo);
  const yamlContent = buildDependabotYML(updates);
  const encoded = Buffer.from(yamlContent, 'utf-8').toString('base64');

  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: '.github/dependabot.yml',
    message: 'Add dependabot.yml for dependency updates',
    content: encoded,
    branch: defaultBranch,
  });

  console.log(' Dependabot configuration committed successfully.');
};
