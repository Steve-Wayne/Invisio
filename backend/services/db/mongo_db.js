

// Connecting Database 
import mongoose from 'mongoose'
import dotenv from'dotenv' 
dotenv.config()
export const ConnectDB= async()=>{
    try {
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URL}`);
        console.log(`Mongo Database Connected !! at host ${connectionInstance.connection.host}`);
        return connectionInstance;
    } catch (error) {
        console.log('Error Connecting with Database' , error);
        process.exit(1);
    }
}
