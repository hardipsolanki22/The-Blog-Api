import { User } from '../models/user.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { uploadCloudinary } from '../utils/Cloudinary.js'
import jwt from 'jsonwebtoken'
import { Post } from '../models/post.models.js'
import { Like } from '../models/like.model.js'
import { Follows } from '../models/followersFollowings.modles.js'
import { Comment } from '../models/comment.model.js'
import mongoose from 'mongoose'

const sendMail = async (username, email, token) => {
    console.log(`username in mail: ${username}`);
    
    try {
        const service = nodemailer.createTransport({
            service: "gmail",
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            }
        })

        const mailOPtions = {
            from: process.env.EMAIL,
            to: email,
            subject: "For Reset Password",
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2 style="color: #333;">Hi ${username},</h2>
                    <p>Please click the link below to reset your password:</p>
                    <a href="http://localhost:5173/reset-password?token=${token}" style="color: #1a73e8;">Reset Password</a>
                </div>
            `

        }

        service.sendMail(mailOPtions, (error, info) => {
            if (error) {
                console.log("error: ", error);
            } else {
                console.log(`Mail has been send: `, info);
            }

        })

    } catch (error) {
        throw new ApiError(500, "Internal server error: ", error.message)
    }
}

const generateAccessRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const AccessToken = user.generateAceessToken()
        const RefreshToken = user.generateRefreshToken()
        user.refreshToken = RefreshToken
        await user.save({ validateBeforeSave: true })

        return { AccessToken, RefreshToken }
    } catch (error) {
        throw new ApiError(500, error.message || "Internal server error while generate access and refresh token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body

    if ([username, email, password].some((field) => field?.trim() === '')) {
        throw new ApiError(400, "All field are require")
    }

    const isUserExsist = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (isUserExsist) {
        throw new ApiError(400, "User with this email isalredy exsist")
    }

    const avatar = req.file?.path

    if (!avatar) {
        throw new ApiError(400, "Avatar is require")
    }

    const avatarLocalPath = await uploadCloudinary(avatar)

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is missing")
    }

    const createUser = await User.create({
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatarLocalPath
    })

    const user = await User.findById(createUser._id).select(
        "-password"
    )

    if (!user) {
        new ApiError(500, "Internal eerver error")
    }

    return res.status(201).json(
        new ApiResponse(201, user, "User register successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body

    if (!(email || username)) {
        throw new ApiError(400, "username or email is require")
    }


    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(400, "User does not exists")
    }

    if (!password) {
        throw new ApiError(400, "password is require")
    }

    const validPassword = await user.isPasswordCurrect(password)

    if (!validPassword) {
        throw new ApiError(400, "Invalid password")

    }

    const { AccessToken, RefreshToken } = await generateAccessRefreshToken(user._id)

    const loginUser = await User.findById(user._id).select(
        '-password -refreshToken'
    )

    const option = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie('accessToken', AccessToken, option)
        .cookie('refreshToken', RefreshToken, option)
        .json(
            new ApiResponse(200, {
                AccessToken, RefreshToken
            }, 'user login success'
            )
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        { new: true }
    )

    const option = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie('accessToken', option)
        .clearCookie('refreshToken', option)
        .json(
            new ApiResponse(200, {}, 'logout user successfully')
        )

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken || req.header('Authorized')

    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id)

    if (!user) {
        throw new ApiError(400, 'Unsuthorized request')
    }

    if (token !== user.refreshToken) {
        throw new ApiError(400, "Invalid refreshToken ")
    }

    const { AccessToken, RefreshToken } = await generateAccessRefreshToken(user._id)

    const option = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie('accessToekn', AccessToken, option)
        .cookie('refreshToken', RefreshToken, option)
        .json(
            new ApiResponse(200, {
                AccessToken, RefreshToken, user,
            }
                , 'accessToken refresh successfully')
        )

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .json(
            new ApiResponse(200, req.user, 'User found successfully')
        )
})

const forgetPassword = asyncHandler(async (req, res) => {
    const { email } = req.body

    if (!email) {
        throw new ApiError(400, "email is required")
    }

    const userExsist = await User.findOne({ email })

    if (!userExsist) {
        throw new ApiError(404, "user does not exsist")
    }

    const randomeString = userExsist.generateRandomeStrings()

    const user = await User.updateOne({ email },
        {
            $set: {
                token: randomeString
            }
        },
        {
            new: true
        }
    )

    sendMail(userExsist?.username, email, randomeString)

    return res.status(200)
        .json(
            new ApiResponse(200, {}, "check your inbox of mail.")
        )


})

const resetPassword = asyncHandler(async (req, res) => {

    const { token } = req.query
    const { password } = req.body

    if (!password) {
        throw new ApiError(400, "password is reuqired")
    }

    const decodedInfo = jwt.verify(token, process.env.RANDOME_STRING_GENERATE)

    const user = await User.findById(decodedInfo?._id)

    if (!user) {
        throw new ApiError(404, "Link is expired")
    }

    if (user.token !== token) {
        throw new ApiError(400, "Invalid token")
    }

    if (user.password === password) {
        throw new ApiError(400, "Please Enter strong password")
    }

     user.password = password
     await user.save()


    return res.status(200)
        .json(
            new ApiResponse(200, {}, "update password succesfully")
        )

})

const changePassword = asyncHandler(async (req, res) => {
    const { oldpassword, newpassword, conformpassword } = req.body

    if (!(oldpassword, newpassword, conformpassword)) {
        throw new ApiError(400, 'All field are require')
    }

    if (newpassword !== conformpassword) {
        throw new ApiError(400, "password is not same")
    }

    const user = await User.findById(req.user._id)

    const validePassword = await user.isPasswordCurrect(oldpassword)

    if (!validePassword) {
        throw new ApiError(400, "Invalide password")
    }

    user.password = newpassword
    await user.save({ validayeBeforeSave: false })

    res.status(200)
        .json(
            new ApiResponse(200, {}, 'password change successfully')
        )
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const username = req.body?.username
    const email = req.body?.email
    const avatarLocalPath = req.file?.path

    const avatar = await uploadCloudinary(avatarLocalPath)

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                username,
                email,
                avatar
            }
        },
        { new: true }
    ).select('-password')

    return res.status(200)
        .json(
            new ApiResponse(200, user, "user details update successfully")
        )
})

const searchUser = asyncHandler(async (req, res) => {

    const {username} = req.query

    if (!username) {
        throw new ApiError(400 , "username is required")
    }

    const user = await User.find({ username: new RegExp(username, "i") })

    if (!user) {
        throw new ApiError(404, "user not found")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, user, "User found successfully")
        )

})

const getUserProfile = asyncHandler(async(req, res) => {
    const {username} = req.params    

    if (!username) {
        throw new ApiError("username is required");
    }

    const profile = await User.aggregate([
        {
            $match: {
                username: username
            }
        },
        {
            $lookup: {
                from: "follows",
                foreignField: "followers",
                localField: "_id",
                as: "followings"
            }
        },
        {
            $lookup: {
                from: "follows",
                foreignField: "followings",
                localField: '_id',
                as: "followers"
            }
        },
        {
            $addFields: {
                followingsCount: {
                    $size: {$ifNull: ["$followings", []]}
                },
                followersCount: {
                        $size: { $ifNull: ["$followers", []]}
                },
                isFollowed: {
                   $cond: {
                    if: {$in: [req.user?._id, "$followers.followers"]},
                    then: true,
                    else: false
                   }
                }
            }
        },
        {
            $project: {
                username: 1,
                email: 1,
                avatar: 1,
                followingsCount: 1,
                followersCount: 1,
                isFollowed: 1


            }
        }
    ])

    if (!profile.length) {
        throw new ApiError(404, "profile dose not exist")
    }

    return res
    .status(200)
    .json( new ApiResponse(200 , profile[0] , "user profiule fetched successfully"))

})





export {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    forgetPassword,
    resetPassword,
    changePassword,
    refreshAccessToken,
    updateUserDetails,
    searchUser,
    getUserProfile,

}