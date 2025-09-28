// import axios from 'axios';
// import dotenv from 'dotenv';

// dotenv.config();

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// const openai = axios.create({
//   baseURL: 'https://api.openai.com/v1/chat/completions',
//   headers: {
//     'Content-Type': 'application/json',
//     Authorization: `Bearer ${OPENAI_API_KEY}`,
//   },
// });

// export const OpenAIService = class {

//   async generate_fix(alertMessage, codeSnippet) {
//     try {
//       const prompt = `
// You are a code assistant specializing in fixing CodeQL alerts.

// Alert message:
// ${alertMessage}

// Here is the relevant code snippet:
// \`\`\`
// ${codeSnippet}
// \`\`\`

// Please provide a concise code fix addressing the issue in the snippet.
// Only provide the fixed code or code changes — no explanations or extra text.
// If the alert is security-related, prioritize security best practices.Do not add or change any functionality.
// `;

//       const response = await openai.post('', {
//         model: 'gpt-3.5-turbo', // or 'gpt-4' if available
//         messages: [{ role: 'user', content: prompt }],
//         temperature: 0.2,
//       });

//       const fix = response.data.choices[0].message.content.trim();
//       return fix;
//     } catch (e) {
//       console.error('Error generating fix with OpenAI:', e);
//       throw e;
//     }
//   }

//   async deduplicate_fix(fixJson) {
//     try {
//       const prompt = `
// You will be given a JSON object with a "fix" field containing source code in any programming language, wrapped in triple backticks (\\\`\\\`\\\`).

// Your task:

// 1. Extract the code block from the "fix" field.
// 2. Merge duplicate import/include statements from the same module, path, or package.
// 3. Remove repeated definitions (functions, routes, methods,imports etc.) with identical names or signatures. Keep only the last one.
// 4. Do not modify, optimize, or refactor any other part of the code.
// 5. Ensure the original logic and behavior remains unchanged.
// 6. Return only the cleaned code, wrapped in triple backticks with the correct language identifier (e.g., \\\`\\\`\\\`js, \\\`\\\`\\\`py, \\\`\\\`\\\`cpp).
// 7. Do not include any explanation, commentary, or output outside the code block.

// Your response must contain only the cleaned code block. No prose.

// JSON input:
// \`\`\`json
// ${JSON.stringify(fixJson, null, 2)}
// \`\`\`
// `;

//       const response = await openai.post('', {
//         model: 'gpt-4',
//         messages: [{ role: 'user', content: prompt }],
//         temperature: 0.2,
//       });

//       return response.data.choices[0].message.content.trim();
//     } catch (e) {
//       console.error('Error deduplicating fix with OpenAI:', e);
//       throw e;
//     }
//   }
// };

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = axios.create({
  baseURL: "https://api.openai.com/v1/chat/completions",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
});

export const OpenAIService = class {
  /**
   * Generate a structured AI fix for a CodeQL alert.
   * @param {string} vulnInfo - General vulnerability info and fix patterns.
   * @param {string} alertMessage - CodeQL alert message.
   * @param {string} codeSnippet - Extracted code snippet with AI markers.
   */
  //
async generate_fix(alertMessage, codeSnippet, vulnInfo) {
  try {
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
- Do not alter any other part of the code outside the markers.
- Copy "before" exactly from the snippet above.
- Put the fixed code in "after".
- If no dependencies, set "dependencies": [].
- Output must be valid, parseable JSON.
    `;

    const response = await openai.post("", {
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    // Parse JSON directly from model output
    let fixData;
    try {
      fixData = JSON.parse(response.data.choices[0].message.content.trim());
    } catch (err) {
      throw new Error("generate_fix did not return valid JSON: " + err.message);
    }

    return fixData;
  } catch (err) {
    console.error("Error generating fix with OpenAI:", err);
    throw err;
  }
}


  /**
   * Deduplicate imports & definitions in code after AI fixes.
   * @param {Object} fixJson - Output JSON containing code in fix field.
   */
  async deduplicate_fix(fixJson) {
    try {
      const prompt = `
You will be given a JSON object with a "fix" field containing source code (triple backticks).

Your task:
1. Extract the code block from the "fix" field.
2. Merge duplicate import/include statements from the same module/path/package.
3. Remove repeated definitions (function, method, route) with identical names/signatures — keep only the last occurrence.
4. Do NOT touch any unrelated lines. Do NOT refactor logic.
5. Output only the cleaned code, inside triple backticks with correct language identifier (e.g. \`\`\`js).

JSON input:
\`\`\`json
${JSON.stringify(fixJson, null, 2)}
\`\`\`
      `;

      const response = await openai.post("", {
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      });

      return response.data.choices[0].message.content.trim();
    } catch (e) {
      console.error("Error deduplicating fix with OpenAI:", e);
      throw e;
    }
  }
};
