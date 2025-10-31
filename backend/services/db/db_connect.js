import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

let pinecone_index; // one connection per index is enough

const connect_pinecone = async () => {
  if (!pinecone_index) {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(
      process.env.PINECONE_DB_NAME,
      process.env.PINECONE_DB_HOST
    );
    pinecone_index = index;
  }
  return pinecone_index;
};

const get_namespaces= async()=>{
  const pc=await connect_pinecone();
  const namespaces=await pc.listNamespaces();
  const namespace_list=namespaces.namespaces.map(ns=>ns.name);
  console.log("Pinecone namespaces:", namespace_list);
  return namespace_list;
}


export const search_queries = async (query , language) => {
  const pc= await connect_pinecone();
  const namespace= await get_namespaces();
  let ns;
  namespace.includes(language) ? ns=pc.namespace(language) : ns=pc.namespace('Security-Docs');
  const response = await ns.searchRecords({
    query: {
      topK: 2,
      inputs: { text: query },
    },
    fields: ["text"],
  });
  console.log("Pinecone search response:", response.result.hits);
  return response.result;
};
