import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenerativeAI(GEMINI_API_KEY); //  Use new SDK signature

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

      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' }); //  Instantiate model
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
      console.error('Error analyzing PR with Gemini:', e);
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
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const resolved = result.response.text();

      // Optionally clean code block formatting
      const match = resolved.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
      return match ? match[1] : resolved;
    } catch (e) {
      console.error('Error resolving conflict with Gemini:', e);
      throw e;
    }
  }


};
