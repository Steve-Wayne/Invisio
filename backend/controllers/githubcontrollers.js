import { error } from 'console';
import { Install_process, getUserInstallationsAndRepos }   from '../services/githubService.js';
import fs from 'fs';
import { InvisioFlow } from '../services/WorkflowService.js';
import { OpenAIService } from '../services/models/provider_openai.js';

export const authenticate_app=async(req,res)=>{
  try{
    const obj=new Install_process();
    const data=await obj.test_app();
    if (!data) {
      return res.status(404).json({ error: 'Failed to authenticate' });
    }
    console.log(data)
    res.json(data);

  }
  catch(error){
    console.error('Something went Wrong' , error);
    res.status(500).json({error:'Operation failed'})
  }
}

export const fetch_installations= async(req,res)=>{
  try{
    const obj=new Install_process();
    const data=await obj.get_Installations();
    if (!data) {
      return res.status(404).json({ error: 'Failed to authenticate' });
    }
    res.json(data);
  }
  catch(error){
    console.error('Could not get Installations' , error);
    res.status(500).json({error:'Failed'})
  }
}

export const generate_install_token= async(req,res)=>{
  const {id}=req.params;
  try{
    const obj=new Install_process(id);
    const data=await obj.create_install_token();
    if (!data) {
      return res.status(404).json({ error: 'Failed to generate' });
    }
    res.json(data);

  }
  catch(error){
    console.error("Could not geneate Token" , error);
    res.status(500).json({error:"Failed"})
  }
}

export const get_id=async(req,res)=>{

  const {id}=req.params;
  try {
    const obj=new Install_process(id);
    const data=await obj.verify_install();
    if (!data) {
      return res.status(404).json({ error: 'Failed to generate' });
    }
    res.json(data);
  } catch (error) {
    console.error('Could not get id' , error);
    res.status(500).json({error:'Please check'})
  }
}

export const getRepository = async (req, res) => {
    const { owner, repo } = req.params;
    
    try {
      const obj= new InvisioFlow(owner);
      await obj.init();
      const data= await obj.checkflow(repo)// Service call
      if (!data) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      res.json(data);
    } catch (error) {
      console.error('Error fetching repository:', error);
      res.status(500).json({ error: 'Failed to fetch repository GitHub' });
    }
  };

  export const checkRepoWebhook = async (req, res, next) => {
    const { owner, repo } = req.params;
    const { webhookUrl } = req.query; // Pass the webhook URL as a query parameter
  
    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl query parameter is required' });
    }
  
    try {
      const workflowService = new InvisioFlow(owner);
      await workflowService.init();
      const exists = await workflowService.hasWebhook(repo, webhookUrl);
      res.json({ exists });
    } catch (error) {
      next(error);
    }
  };

  export const getUserInstallationsAndReposController = async (req, res, next) => {
    const { userLogin } = req.params;
    try {
      const result = await getUserInstallationsAndRepos(userLogin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

export const getPulls=async(req , res , next)=>{
  try {
    const { owner, repo } = req.params;
    const obj = new InvisioFlow(owner);
    await obj.init();
    const data = await obj.get_pull_request(repo);
    const number= data.map(pr => pr.number);
    const pullRequests = [];
    for (const num of number) {
      const pull = await obj.getPullDetails(repo, num);
      pullRequests.push(pull);
    }
    if (pullRequests.length === 0) {
      return res.status(404).json({ error: 'Pull requests not found' });
    }
    res.json(pullRequests);
  } catch (error) {
    console.error('Error fetching pull requests:', error);
    res.status(500).json({ error: 'Failed to fetch pull requests' });
  }
}