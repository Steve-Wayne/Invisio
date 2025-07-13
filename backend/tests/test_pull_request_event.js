import { GeminiService } from '../services/provider_gemini.js';
import dotenv from 'dotenv';
dotenv.config();

const prTests = [
  {
    lang: 'Python',
    prTitle: 'Add new feature to Python API',
    prBody: 'Implements a new endpoint for data export.',
    prDiff: `diff --git a/api/main.py b/api/main.py\nindex 123..456 100644\n--- a/api/main.py\n+++ b/api/main.py\n@@ ...\n+def export_data():\n+    pass`,
  },
  {
    lang: 'JavaScript',
    prTitle: 'Fix bug in authentication middleware',
    prBody: 'This PR fixes a bug where users could bypass authentication under certain conditions.',
    prDiff: `diff --git a/backend/middleware/auth.js b/backend/middleware/auth.js\nindex 1234567..89abcde 100644\n--- a/backend/middleware/auth.js\n+++ b/backend/middleware/auth.js\n@@ ...\n- if (!user) return next();\n+ if (!user) return res.status(401).send('Unauthorized');`,
  },
  {
    lang: 'Java',
    prTitle: 'Refactor UserService for better performance',
    prBody: 'Optimizes user lookup and caching.',
    prDiff: `diff --git a/src/UserService.java b/src/UserService.java\nindex 111..222 100644\n--- a/src/UserService.java\n+++ b/src/UserService.java\n@@ ...\n- // old code\n+ // new optimized code`,
  },
  {
    lang: 'Go',
    prTitle: 'Add error handling to HTTP server',
    prBody: 'Improves robustness by handling server errors.',
    prDiff: `diff --git a/server/main.go b/server/main.go\nindex 333..444 100644\n--- a/server/main.go\n+++ b/server/main.go\n@@ ...\n- http.ListenAndServe(":8080", nil)\n+ log.Fatal(http.ListenAndServe(":8080", nil))`,
  },
];

async function testPullRequestEvents() {
  const gemini = new GeminiService();
  for (const { lang, prTitle, prBody, prDiff } of prTests) {
    const result = await gemini.analyze_pr(prTitle, prBody, prDiff);
    console.log(`${lang} PR Analysis:`, result);
  }
}

testPullRequestEvents();
