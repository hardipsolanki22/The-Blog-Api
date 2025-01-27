import jwt from 'jsonwebtoken'
import { ApiError } from "../utils/ApiError.js"
import { User } from '../models/user.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const verifyJwt = asyncHandler(async (req, res, next) => {
    try {
         const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer', '') 
       //  console.log(`Token: ${token}`);
         

        if (!token) {
            throw new ApiError(401, 'Unauthorized request')
        }

        const decodeToken =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodeToken._id).select(
            '-password -refreshToken'
        )

       // console.log(`User is : ${user}`);

        

        if (!user) {
            throw new ApiError(400, 'Invalide accessToken')
        }

        req.user = user
        next()
      

    } catch (error) {
        throw new ApiError(500, error.message)
    }

})


export { verifyJwt }