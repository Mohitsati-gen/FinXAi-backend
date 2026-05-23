import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

async function connectDB() {
    try {
       const connectioninstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       console.log(`MongoDB connected !! DB host : ${connectioninstance.connection.host}`) // it will give the url of actuall mongodb database
    } catch (error) {
        console.log("MongoDB connection failed: " , error)
        process.exit(1)
    }
}

export default connectDB