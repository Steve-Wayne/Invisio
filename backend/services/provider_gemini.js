import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { search_queries } from "./db/db_connect.js";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

export const GeminiService = class {
  async analyze_pr(prTitle, prBody, prDiff) {
    try {
      const prompt = `
You are an expert code reviewer. Analyze the following pull request and suggest appropriate labels (e.g., bug, enhancement, documentation, refactor, security, test, dependencies, etc.) and a concise, constructive review comment for the author.

Pull Request Title:
${prTitle}

Pull Request Description:
${prBody}

Pull Request Diff (unified diff format):
${prDiff}

Respond in the following JSON format:
{
  "labels": ["label1", "label2", ...],
  "comment": "Your review comment here."
}
`;

      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" }); //  Instantiate model
      const result = await model.generateContent(prompt); //  Use generateContent (not stream)
      const text = result.response.text(); //  Extract plain text

      // Optional: Parse JSON
      const jsonMatch = text.match(/```json[\s\S]*?({[\s\S]*?})[\s\S]*?```/i);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        parsed = { labels: [], comment: text };
      }

      return parsed;
    } catch (e) {
      console.error("Error analyzing PR with Gemini:", e);
      throw e;
    }
  }
  async resolveConflict(filename, conflictedContent) {
    try {
      const prompt = `
You are an expert software engineer. The following file has merge conflicts marked with <<<<<<<, =======, and >>>>>>>.
Please resolve the conflict in '${filename}' by choosing the best code from both sides or merging them intelligently.

Return only the resolved code content, without any explanations.

File content:
${conflictedContent}
`;
      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const resolved = result.response.text();

      // Optionally clean code block formatting
      const match = resolved.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
      return match ? match[1] : resolved;
    } catch (e) {
      console.error("Error resolving conflict with Gemini:", e);
      throw e;
    }
  }
  
  async generate_fix(alertMessage, codeSnippet, vulnInfo , lang) {
    try {
      const pineconeResults = await search_queries(alertMessage, lang);
      const pineconeContext =
        pineconeResults.hits.text?.map((r) => r.text).join("\n---\n") || "";
      const prompt = `
You are a senior secure coding assistant.
Relevant Help and Examples:
${"No additional context found."}
If you dont find the context useful, just answer based on your own knowledge.
Your task:
1. Read the vulnerability message and provided code snippet.
2. Apply the fix only between '// AI FIX START' and '// AI FIX END'.
3. Follow the general guidance.

Return ONLY valid JSON in this format WITHOUT triple backticks:
{
  "explanation": "Short explanation",
  "before": "Original snippet",
  "after": "Fixed snippet",
  "dependencies": ["dep1", "dep2"] // or []
}

### Problem
${alertMessage}

### Code to Fix
\`\`\`js
${codeSnippet}
\`\`\`

### General Guidance
${vulnInfo}

Instructions:
- Do not alter code outside markers.
-If a helper function or constant is needed, you may define it above the '// AI FIX START' line.
- Output must be valid JSON.
    `;

      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);

      // Get text from Gemini
      let aiText = result.response.text().trim();

      // Remove markdown fences if present (``````json)
      aiText = aiText
        .replace(/^```(?:\w+)?\n?/, "") // start block
        .replace(/```$/, "");

      // Parse JSON safely
      let fixData;
      try {
        fixData = JSON.parse(aiText);
      } catch (err) {
        throw new Error(
          `generate_fix did not return valid JSON: ${err.message}\nRaw text was:\n${aiText}`
        );
      }

      return fixData;
    } catch (err) {
      console.error("Error generating fix with Gemini:", err);
      throw err;
    }
  }

  // ----------------------------
  // Deduplication Utility
  async deduplicate_fix(fixJson) {
    try {
      const prompt = `
You will be given a JSON object with a "fix" field containing source code.

Your task:
1. Merge duplicate imports from the same module/path.
2. Remove repeated definitions with identical names/signatures — keep last one.
3. Do NOT change unrelated code.
4. Output only the cleaned code in triple backticks.

JSON input:
\`\`\`json
${JSON.stringify(fixJson, null, 2)}
\`\`\`
`;

      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // 🔹 Capture code inside triple backticks (with optional language)
      const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);

      // If match found, return just the code without backticks
      return match ? match[1].trim() : text;
    } catch (e) {
      console.error("Error deduplicating fix with Gemini:", e);
      throw e;
    }
  }
};
