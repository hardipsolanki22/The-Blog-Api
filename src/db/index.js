import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async() => {
    try {
        const connection = await mongoose.connect(`${process.env.DB_URI}/${DB_NAME}`)
        console.log(`MongoDB Connect Successfully...`);
        console.log(`DB HOST...${connection.connection.host}`);
        
    } catch (error) {
        console.log("Database Connectio Failed :: " , error);
        process.exit(1)
        
    }
}

export {connectDB}