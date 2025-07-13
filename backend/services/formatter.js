import axios from "axios";  
import base64 from "base-64";
import prettier from "prettier";

export const formatJavaScript=async (code) =>{
  return prettier.format(code, { parser: "babel", semi: true, singleQuote: true });
}


export const extractCodeBlock = async (markdown) => {
  const match = markdown.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : markdown.trim();
};
