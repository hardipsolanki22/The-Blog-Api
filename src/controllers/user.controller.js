import { User } from '../models/user.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { uploadCloudinary } from '../utils/Cloudinary.js'
import jwt from 'jsonwebtoken'
import { transporter } from '../utils/mail.js'
import { Follows } from '../models/followersFollowings.modles.js'
import mongoose from 'mongoose'

const sendMail = async (username, email, token) => {
    try {
        const mailOPtions = {
            from: process.env.EMAIL,
            to: email,
            subject: "For Reset Password",
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2 style="color: #333;">Hi ${username},</h2>
                    <p>Please click the link below to reset your password:</p>
                    <a href="http://localhost:5173/reset-password?token=${token}" style="color: #1a73e8;">Reset Password</a>
                </div>`
        }

        transporter.sendMail(mailOPtions, (error, info) => {
            if (error) {
                throw new ApiError(500, "Error while send mail")
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
    const { name, username, email, password } = req.body

    if ([name, username, email, password].some((field) => field?.trim() === '')) {
        throw new ApiError(400, "All fields are required")
    }

    const isUserExsist = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (isUserExsist) {
        throw new ApiError(400, "User with this email and username already exists")
    }    
    

    const avatarLocalPath = req.files?.avatar?.[0].path;
    const coverImageLocalPath = req.files?.coverImage?.[0].path;


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }
    const avatar = await uploadCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath && await uploadCloudinary(coverImageLocalPath)


    if (!avatar) {
        throw new ApiError(400, "Avatar is missing")
    }

    const createUser = await User.create({
        name: `@${name}`,
        username: username.toLowerCase(),
        email,
        password,
        avatar,
        coverImage: coverImage ?? ""
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
    const { email, password } = req.body        

    if (!email) {
        throw new ApiError(400, "username or email is require")
    }


    const user = await User.findOne({email})

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

    const user = await User.findOne({ email })

    if (!user) {
        throw new ApiError(404, "user does not exsist")
    }

    const randomeString = user.generateRandomeStrings()

    await User.updateOne({ email },
        {
            $set: {
                token: randomeString
            }
        },
        {
            new: true
        }
    )

    sendMail(user.username, email, randomeString)

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
    await user.save({ validateBeforeSave: true })


    return res.status(200)
        .json(
            new ApiResponse(200, {}, "update password succesfully")
        )

})

const changePassword = asyncHandler(async (req, res) => {
    const { oldpassword, newpassword } = req.body

    if (oldpassword || newpassword) {
        throw new ApiError(400, 'All field are require')
    }

    const user = await User.findById(req.user._id)

    const validePassword = await user.isPasswordCurrect(oldpassword)

    if (!validePassword) {
        throw new ApiError(400, "Invalide password")
    }

    user.password = newpassword
    await user.save({ validayeBeforeSave: true })

    res.status(200)
        .json(
            new ApiResponse(200, {}, 'password change successfully')
        )
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const { name, username, email } = req.body

    if (!name || !username || !email) {
        throw new ApiError(400, "at least one field is required")
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                name,
                username,
                email,
            }
        },
        { new: true }
    ).select('-password')

    return res.status(200)
        .json(
            new ApiResponse(200, user, "user details update successfully")
        )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }    

    const avatar = await uploadCloudinary(avatarLocalPath)

    if (!avatar) {
        throw new ApiError(400, "error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                avatar
            }
        }
    ).select("-password")

    return res.status(200)
        .json(
            new ApiResponse(200, user, "Avatar image update successfully")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image is required")
    }

    const coverImage = await uploadCloudinary(coverImageLocalPath)

    if (!coverImage) {
        throw new ApiError(400, "error while updating cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage
            }
        }
    ).select("-password")

    return res.status(200)
        .json(
            new ApiResponse(200, user, "Cover image update successfully")
        )
})

const searchUser = asyncHandler(async (req, res) => {

    const { username } = req.query

    if (!username) {
        throw new ApiError(400, "username is required")
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

const getUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

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
                    $size: { $ifNull: ["$followings", []] }
                },
                followersCount: {
                    $size: { $ifNull: ["$followers", []] }
                },
                isFollowed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$followers.followers"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                name: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
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
        .json(new ApiResponse(200, profile[0], "user profiule fetched successfully"))

})

const getAllUsers = asyncHandler(async (req, res) => {
    // get user following
    // if user following some user than find
    // those user which is not preset in  current user followings list
    // if user does not following any user than find 
    // all users not only login user

    const userFollowings = await Follows.find({ followers: req.user._id })
    userFollowings.push({followings: req.user._id})

    const followingIds = userFollowings.map((follow) => follow.followings)    

    let users;

    if (userFollowings.length > 0) {
        users = await User.find({ _id: { $nin: followingIds} }).select("-password")
    } else {
        users = await User.find({ _id: { $nin: new mongoose.Types.ObjectId(req.user._id) } }).select("-password")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, users, "All users found successfully")
        )


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
    updateUserAvatar,
    updateUserCoverImage,
    searchUser,
    getUserProfile,
    getAllUsers

}