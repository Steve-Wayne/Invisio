import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const deepseek = axios.create({
  baseURL: "https://api.deepseek.com/v1/chat/completions",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
  },
});

export const DeepSeekService = class {
  /**
   * Generate a structured AI fix for a CodeQL alert.
   */
  async generate_fix(alertMessage, codeSnippet, vulnInfo) {
    try {
      console.log("DeepSeek API Key:", DEEPSEEK_API_KEY);
      const prompt = `
You are a senior secure coding assistant.

Your task:
1. Read the vulnerability message and the provided code snippet.
2. Apply the fix only between the markers '// AI FIX START' and '// AI FIX END'.
3. Follow the general guidance provided.

Return ONLY valid JSON in the following format, with no explanations or text outside the JSON:

{
  "explanation": "Short explanation of what was fixed",
  "before": "Original code snippet exactly as provided, including markers",
  "after": "Fixed code snippet",
  "dependencies": ["dependency1", "dependency2"] // or []
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
- Copy "before" exactly from the snippet above.
- Put the fixed code in "after".
- If no dependencies, set "dependencies": [].
- Output must be valid parseable JSON.
      `;

      const response = await deepseek.post("", {
        model: "deepseek-code", // or "deepseek-chat"
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      });

      let fixData;
      try {
        fixData = JSON.parse(
          response.data.choices[0].message.content.trim()
        );
      } catch (err) {
        throw new Error(
          "generate_fix did not return valid JSON: " + err.message
        );
      }

      return fixData;
    } catch (err) {
      console.error("Error generating fix with DeepSeek:", err);
      throw err;
    }
  }

  /**
   * Deduplicate imports & definitions in code after AI fixes.
   */
  async deduplicate_fix(fixJson) {
    try {
      const prompt = `
You will be given a JSON object with a "fix" field containing source code (triple backticks).

Your task:
1. Extract the code block from the "fix" field.
2. Merge duplicate imports from the same path.
3. Remove repeated function/method/route definitions — keep only the last.
4. Do NOT change unrelated lines. Do NOT refactor logic.
5. Output only the cleaned code, inside triple backticks with correct language identifier.

JSON input:
\`\`\`json
${JSON.stringify(fixJson, null, 2)}
\`\`\`
      `;

      const response = await deepseek.post("", {
        model: "deepseek-code", // better for programming tasks
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      });

      return response.data.choices[0].message.content.trim();
    } catch (e) {
      console.error("Error deduplicating fix with DeepSeek:", e);
      throw e;
    }
  }
};
