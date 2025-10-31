import axios from "axios";  
import base64 from "base-64";
import prettier from "prettier";
import hljs from "highlight.js";

export const detectLanguage = async (code) => {
  const result = hljs.highlightAuto(code);
  const lang = result.language ? result.language.toLowerCase() : "plaintext";

  console.log("Detected language:", lang);
  return lang;
};

export const parseAIFixResponse=async(aiOutput)=>{
  if (!aiOutput || typeof aiOutput !== 'string') {
    return { explanation: '', before: '', after: '', dependencies: [] };
  }

  // Extract explanation
  const explanationMatch = aiOutput.match(/###\s*1\.\s*Explanation\s+([\s\S]*?)(?=###\s*2\.)/i);
  const explanation = explanationMatch?.[1].trim() || '';

  // Extract "Before" code
  const beforeMatch = aiOutput.match(/\*\*Before\*\*\s*``````/i);
  const before = beforeMatch?.[1].trim() || '';

  // Extract "After" code
  const afterMatch = aiOutput.match(/\*\*After\*\*\s*``````/i);
  const after = afterMatch?.[1].trim() || '';

  // Extract dependencies list
  const depsMatch = aiOutput.match(/###\s*3\.\s*Dependencies\s+([\s\S]*)/i);
  let dependencies = [];
  if (depsMatch?.[1]) {
    dependencies = depsMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
  }

  return { explanation, before, after, dependencies };
}

export const formatJavaScript=async (code) =>{
  return prettier.format(code, { parser: "babel", semi: true, singleQuote: true });
}


export const extractCodeBlock = async (markdown) => {
  const match = markdown.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : markdown.trim();
};
