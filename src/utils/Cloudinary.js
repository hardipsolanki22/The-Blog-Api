import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'

cloudinary.config({
    cloud_name : process.env.CLOUDNIRY_CLOUD_NAME,
    api_key : process.env.CLOUDNIRY_API_KEY,
    api_secret : process.env.CLOUDNIRY_API_SECRET
})

const uploadCloudinary = async (localPath)  => {
    try {

        if(!localPath) return null

        const response = await cloudinary.uploader.upload(localPath , {
            resource_type: 'auto'
        })
        if(response) fs.unlinkSync(localPath)
        return response.url
    } catch (error) {
        fs.unlinkSync(localPath)
        console.log(`Error While upload file on Cloudinary ::  ` , error);
    }
}

export {uploadCloudinary}