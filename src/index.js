import { connectDB } from "./db/index.js";
import dotenv from 'dotenv'
import { app } from "./app.js";

dotenv.config({
    path: './env'
})

connectDB().then(() => {

        app.listen(process.env.POST , () => {
            console.log(`Application is runing on port ${process.env.POST}`);
            
        })

        app.on('Error' , (error) => {
            console.log('Server is not able to tolk with MongodB', error);
        })
    })
    .catch((error) => {
        console.log('Error MongoDB Connetion Failed in Promise' , error);
        process.exit(1)
        
    })