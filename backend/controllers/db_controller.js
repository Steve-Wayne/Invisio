import { User } from "../models/user.models.js";
import { Repo } from "../models/repo.models.js";
import { PullRequest } from "../models/pulls.models.js";
import {Alerts} from "../models/alerts.models.js";

// User methods
async function CreateNewUser(name , id , repositories) {
       // creates a new user with name and id
       // creates the repo objects from the input repo objects list
       // links them back to user by udating that field in user cheme
       try {
        const username=name; const user_id=id;
        const newUser=new User({username , user_id});
        const repoDocs = await Promise.all(
       repositories.map(async (repo) => {
         const newRepo = new Repo({
           name: repo.name,
           id: repo.id, 
           html_url: repo.html_url,
           owner: newUser._id,
         });
         await newRepo.save();
         return newRepo._id;
       })
     );
     newUser.Repositories=repoDocs;
     await newUser.save();
     return newUser;
       } catch (error) {
         console.error("Could not Add new user to db" , error);
         return null;
       }
}

async function RepositoriesAdded(name , id , repositories){
    // get the user 
    // create new repodocs list object
    // append the users repository list 
     try {
        const user_db=await User.findOne({user_id:id});
        const repoDocs = await Promise.all(
       repositories.map(async (repo) => {
         const newRepo = new Repo({
           name: repo.name,
           id: repo.id,
           html_url: repo.html_url,
           owner: user_db._id,
         });
         await newRepo.save();
         return newRepo._id;
       })
     );
     const updatedRepoList = Array.from(
      new Set([...user_db.Repositories.map(String), ...repoDocs.map(String)])
    );
    user_db.Repositories=updatedRepoList;
    await user_db.save();
    return user_db;
     } catch (error) {
       console .log("Could Not Add Repositories" , error);
       return null;
     }

}
async function ReposDeleted(name , id , repo) {
    try {
      const user_db=await User.findOne({user_id:id});
      const repoids=repo.map((repo)=>repo.id);
      const FindReposDb = await Repo.find({
        id: { $in: repoids },
        owner: user_db._id,
      });
      const repoIds = FindReposDb.map((rep) => rep._id);
      console.log(repoIds);

     //console.log(user_db.Repositories);
     if(FindReposDb.length!=0)await Repo.deleteMany({id:{$in: repoids} , owner:user_db._id}); // deleting the repositories
     const UserRepoLinks = user_db.Repositories.filter((rep) => {
       return !FindReposDb.find((res) => res._id.equals(rep));
     });
      console.log(UserRepoLinks)
      user_db.Repositories=UserRepoLinks
      await user_db.save();
      console.log("Repositories Deleted Succesfullly")
    
    } catch (error) {
       console.error("Could Not Delete Repositories" , error);
    }
} 

export const installation_handler = async (payload, event) => {
  // get params from the input
  //  check if the event is installation for the first time or not
  // if first time then save user and repo both
  // else update the repositories and alerts documents and pull request documents
  // alert documents should only be updated in case
  // of repo deletion
  const username=payload.installation.account.login;
  const user_id=payload.installation.account.id;
  let repositories;
  if (event == "installation") {
    // a new user
    repositories = payload.repositories;
    return  await CreateNewUser(username , user_id , repositories );
    
  } else {
    // old user
    if (payload.action === "added") {
       //add repos
      repositories = payload.repositories_added;
      return await RepositoriesAdded(username , user_id , repositories);
      
    } else {
      // delete repos
      repositories = payload.repositories_removed;
      await ReposDeleted(username , user_id , repositories);
    }

  }
};

