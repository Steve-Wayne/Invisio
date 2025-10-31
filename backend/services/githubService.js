import { Octokit  } from '@octokit/rest';
import {App } from '@octokit/app'
import fs from 'fs'
import dotenv from 'dotenv'
import { error } from 'console';
import { fileURLToPath } from 'url';
import path from 'path';
dotenv.config()

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const privateKeyPath = path.resolve(__dirname, '..', process.env.APP_PRIVATE_KEY_PATH);
const privateKey=Buffer.from(process.env.APP_PRIVATE_KEY, 'base64').toString('utf-8');
const app= new App({
  appId:Number(process.env.APP_ID),
  privateKey:privateKey,
})

export const Install_process= class Install{
     constructor(id){
         this.id=id;
         this.install_token=null;
         this.timestamp=null;
     }
     async  filters(data, login) {
      if (!Array.isArray(data)) {
        console.error("Input data is not an array");
        return null;
      }
    
      const match = data.find(item => item.account && item.account.login === login);

      if (match) {
        return match.id;
      } else {
        console.log("No installation found for login:", login);
        return null;
      }
    }
    
    
     async test_app(){
      try{
         const response=await app.octokit.request('GET /app');
         //console.log(response.data);
         return response.data;
      }
      catch(error){
        console.error('Error fetching repository:', error);
        throw error;
      }
    }
    async get_Installations(){
      try{
        const response= await app.octokit.request('GET /app/installations');
        
        return response.data;
      }
      catch(error){
        console.error('Install Count Failed', error);
        throw error;
      }
    }
    async verify_install(){
      try {
        const response= await app.octokit.request('GET /app/installations/{installation_id}',{
          installation_id:this.id,
        });
        return response.data;
      } catch (error) {
        console.error('Failed to get details' , error);
        throw error;
      }
    }
    async get_installid(){
      try{
        const response= await app.octokit.request('GET /user/')
      }
      catch(error){
        console.error('Failed to get installation id' , error);
        throw error;
      }
    }
    async  create_install_token(){
      try{
        const response= await app.octokit.request('POST /app/installations/{installation_id}/access_tokens',{
          installation_id:this.id,
        });
        this.install_token=response.data.token;
        this.timestamp=response.data.expires_at;
        return response.data.token;
      }
      catch(error){
        console.error('Install Token Failed', error);
        throw error;
      }
    
    }
    async token_verify(){  
      const cur_date = new Date();  
      const ts_date = new Date(timestamp);   
      const diff = (cur_date - ts_date) / (1000 * 60 * 60);
      if (diff > 1) {  
         await  this.create_install_token();  
      }  
      
      return this.install_token; 
    }
    async create_instance(owner) {
      try {
          const data = await this.get_Installations();
          const filtered_id = await this.filters(data, owner);
          this.id = filtered_id;
          return await this.create_install_token();
      } catch (error) {
          console.error('Error in create_instance:', error);
          throw error;
      }
  }

  
};

// Get all repos a user has installed the app on, and the installation id for the user
export async function getUserInstallationsAndRepos(userLogin) {
  try {
    const response = await app.octokit.request('GET /app/installations');
    const installations = response.data;
    const userInstall = installations.find(inst => inst.account && inst.account.login === userLogin);
    if (!userInstall) {
      return { installationId: null, repositories: [] };
    }
    const tokenResponse = await app.octokit.request('POST /app/installations/{installation_id}/access_tokens', {
      installation_id: userInstall.id
    });
    const installToken = tokenResponse.data.token;
    const installationOctokit = new Octokit({ auth: installToken });
    const reposResponse = await installationOctokit.request('GET /installation/repositories');
    const repositories = reposResponse.data.repositories || [];
    return { installationId: userInstall.id, repositories };
  } catch (error) {
    console.error('Error fetching user installations and repos:', error);
    throw error;
  }
}

