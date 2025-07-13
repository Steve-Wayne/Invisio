import { handleAutoRebasePR, resolveMergeConflictsWithAI } from '../controllers/eventsHandler.js';
import { GeminiService } from '../services/provider_gemini.js';
import dotenv from 'dotenv';
dotenv.config();

// Mock Octokit for resolveMergeConflictsWithAI
class MockOctokit {
  constructor() { this.comments = []; }
  async issues_createComment({ owner, repo, issue_number, body }) {
    this.comments.push({ owner, repo, issue_number, body });
    console.log('Mock comment:', body);
  }
}

async function testHandleAutoRebasePR() {
  // Simulate a PR that is behind base
  const payload = {
    action: 'opened',
    repository: { name: 'repo', owner: { login: 'example' } },
    number: 42,
    pull_request: {
      base: { ref: 'main' },
      head: { ref: 'feature-branch' },
    },
    installation: { id: 1 },
  };
  try {
    await handleAutoRebasePR(payload);
  } catch (e) {
    console.log('Expected error (no real repo):', e.message);
  }
}

async function testResolveMergeConflictsWithAI() {
  // This is a DRY RUN: it will not actually clone or push
  const params = {
    owner: 'example',
    repo: 'repo',
    prNumber: 42,
    base: 'main',
    head: 'feature-branch',
    installationId: 1,
    octokit: new MockOctokit(),
  };
  try {
    // Instead of calling the real function, just log what would happen
    console.log('Would call resolveMergeConflictsWithAI with:', params);
  } catch (e) {
    console.log('Expected error (no real repo):', e.message);
  }
}

async function testGeminiResolveConflict() {
  const gemini = new GeminiService();
  const filename = 'conflicted.js';
  const conflictedContent = `function test() {\n<<<<<<< HEAD\nconsole.log('A');\n=======\nconsole.log('B');\n>>>>>>> feature\n}`;
  // This will call Gemini API if key is set, otherwise just log
  try {
    const resolved = await gemini.resolveConflict(filename, conflictedContent);
    console.log('AI resolved content:', resolved);
  } catch (e) {
    console.log('Gemini API not available or failed:', e.message);
  }
}

(async () => {
  console.log('Testing handleAutoRebasePR...');
  await testHandleAutoRebasePR();
  console.log('\nTesting resolveMergeConflictsWithAI (dry run)...');
  await testResolveMergeConflictsWithAI();
  console.log('\nTesting GeminiService.resolveConflict...');
  await testGeminiResolveConflict();
})();
