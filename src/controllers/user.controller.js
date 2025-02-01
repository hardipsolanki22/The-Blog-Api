import { User } from '../models/user.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { destroyCloudinary, uploadCloudinary } from '../utils/Cloudinary.js'
import jwt from 'jsonwebtoken'
import { transporter } from '../utils/mail.js'
import { Follows } from '../models/followersFollowings.modles.js'

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
                    <a href="https://the-blog-h5bf.onrender.com/reset-password?token=${token}" style="color: #1a73e8;">Reset Password</a>
                </div>`
        }

        // send mail
        transporter.sendMail(mailOPtions, (error, info) => {
            if (error) {
                throw new ApiError(500, "Error while send mail")
            } else {
                console.log('Mail Send Successfully');
            }

        })

    } catch (error) {
        throw new ApiError(500, error.message || "Internal server error while send mail")
    }
}

const generateAccessRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const AccessToken = user.generateAceessToken()
        const RefreshToken = user.generateRefreshToken()
        // save refreshToke to database
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
        throw new ApiError(400, "All fields required")
    }

    const isUserExsist = await User.findOne({
        $or: [{ email }]
    })

    if (isUserExsist) {
        return res.status(409)
            .json(
                new ApiResponse(409, {}, "User Already Exists")
            )
    }

    const isUsernameExist = await User.find({ username })

    if (isUsernameExist.length > 0) {
        return res.status(409)
            .json(
                new ApiResponse(409, {}, "Username Already Availeble")
            )
    }


    const avatarLocalPath = req.files?.avatar?.[0].path;
    const coverImageLocalPath = req.files?.coverImage?.[0].path;


    if (!avatarLocalPath) {
        throw new ApiError(400, {}, "Avatar is required")
    }

    const avatar = await uploadCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath && await uploadCloudinary(coverImageLocalPath)


    if (!avatar) {
        throw new ApiError(500, "Internal server error while uploading image")
    }
    if (coverImageLocalPath && !coverImage) {
        throw new ApiError(500, "Internal server error while uploading image")
    }

    const createUser = await User.create({
        name: `${name.replaceAll("@", "")}`,
        username: username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
        email,
        password,
        avatar,
        coverImage: coverImage ?? ""
    })

    const user = await User.findById(createUser._id).select(
        "-password"
    )

    if (!user) {
        new ApiError(500, "Internal server error")
    }

    return res.status(201).json(
        new ApiResponse(201, user, "Account Created Successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    if (!email) {
        throw new ApiError(400, "Username or Email is required")
    }

    const user = await User.findOne({
        $or: [{ email }]
    })

    if (!user) {
        return res.status(404)
            .json(
                new ApiResponse(404, {}, "User Not Found")
            )
    }

    if (!password) {
        throw new ApiError(400, "Password is required")
    }

    const validPassword = await user.isPasswordCurrect(password)

    if (!validPassword) {
        return res.status(400)
            .json(
                new ApiResponse(400, {}, "Invalid Password")
            )

    }

    const { AccessToken, RefreshToken } = await generateAccessRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select(
        '-password -refreshToken'
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 5,     // cookie expired in 5 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
         path: '/'
    }    
    
    return res.status(200)
        .cookie('accessToken', AccessToken, options)  // set accessToken in cookie 
        .cookie('refreshToken', RefreshToken, options)  // set refreshToke in cookie 
        .json(
            new ApiResponse(200,
                {
                    loggedInUser, AccessToken, RefreshToken
                }, 'Logged In Successfully'
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

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
         path: '/'
    }

    return res.status(200)
        // clear cookis
        .clearCookie('accessToken', options)
        .clearCookie('refreshToken', options)
        .json(
            new ApiResponse(200, {}, 'logged Out Successfully')
        )

})

const refreshAccessToken = asyncHandler(async (req, res) => {

    // get token
    const token = req.cookies?.refreshToken || req.header('Authorized')

    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id)

    if (!user) {
        throw new ApiError(401, 'Unsuthorized request')
    }

    if (token !== user.refreshToken) {
        throw new ApiError(400, "Invalid refreshToken ")
    }

    // refresh access token
    const { AccessToken, RefreshToken } = await generateAccessRefreshToken(user._id)

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        // set cookie
        .cookie('accessToekn', AccessToken, options)
        .cookie('refreshToken', RefreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    AccessToken, RefreshToken,
                }
                , 'AccessToken Refresh Successfully')
        )

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .json(
            new ApiResponse(200, req.user, 'User Fetched Successfully')
        )
})

const forgetPassword = asyncHandler(async (req, res) => {
    const { email } = req.body

    if (!email) {
        throw new ApiError(400, "Email is required")
    }

    const user = await User.findOne({ email })

    if (!user) {
        return res.status(404)
            .json(
                new ApiResponse(404, {}, "User Not Found")
            )
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

    // send main to user
    sendMail(user.username, email, randomeString)

    return res.status(200)
        .json(
            new ApiResponse(200, {}, "Mail Send Successfully.")
        )


})

const resetPassword = asyncHandler(async (req, res) => {

    const { token } = req.query
    const { password, conformPassword } = req.body

    if (!password || !conformPassword) {
        throw new ApiError(400, "All fields required")
    }

    if (password !== conformPassword) {
        return res.status(400)
            .json(
                new ApiResponse(400, {}, "Passwords do not Match..!")
            )
    }

    const decodedInfo = jwt.verify(token, process.env.RANDOME_STRING_GENERATE)

    const user = await User.findById(decodedInfo?._id)

    if (user.token !== token) {
        throw new ApiError(400, "Invalid token")
    }

    if (!user) {
        throw new ApiError(404, "Link is expired")
    }

    user.password = password
    await user.save({ validateBeforeSave: true })


    return res.status(200)
        .json(
            new ApiResponse(200, {}, "Password Updated Succesfully")
        )

})

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, 'All fields required')
    }

    const user = await User.findById(req.user._id)

    const validePassword = await user.isPasswordCurrect(oldPassword)

    if (!validePassword) {
        return res.status(400)
            .json(
                new ApiResponse(400, {}, "Invalid Password")
            )
    }

    user.password = newPassword
    await user.save({ validayeBeforeSave: true })

    res.status(200)
        .json(
            new ApiResponse(200, {}, 'Password Updated Successfully')
        )
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const { name, username, email } = req.body

    if (!name || !username || !email) {
        throw new ApiError(400, "At least one field is required")
    }


    if (username !== req.user.username) {        
        const isUsernameAvailable = await User.find({ username })

        if (isUsernameAvailable.length >= 1) {
            return res.status(409)
                .json(
                    new ApiResponse(409, {}, "Username Already Availeble")
                )
        }
    }


    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                name: `${name.replaceAll("@", "")}`,
                username: username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
                email,
            }
        },
        { new: true }
    ).select('-password')

    return res.status(200)
        .json(
            new ApiResponse(200, user, "Profile Updated Successfully")
        )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadCloudinary(avatarLocalPath)

    if (!avatar) {
        throw new ApiError(500, "Internal server error while uploading avatar")
    }

    // delete avatar from cloudinary
    await destroyCloudinary(req.user.avatar)

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                avatar
            }
        }
    ).select("-password")

    return res.status(200)
        .json(
            new ApiResponse(200, user, "Avatar Image Updated Successfully")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Coverimage is required")
    }

    const coverImage = await uploadCloudinary(coverImageLocalPath)

    if (!coverImage) {
        throw new ApiError(500, "Internal sercer error while uploading cover image")
    }

    // delete coverImage form cloudinary
    req.user?.coverImage && await destroyCloudinary(req.user.coverImage)

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
            new ApiResponse(200, user, "Cover Image Updated Successfully")
        )
})

const searchUser = asyncHandler(async (req, res) => {

    const { username } = req.query

    if (!username) {
        throw new ApiError(400, "username is required")
    }

    const user = await User.find({ username: new RegExp(username, "i") })

    if (!user) {
        return res.status(404)
            .json(
                new ApiResponse(404, {}, "User Not Found")
            )
    }

    return res.status(200)
        .json(
            new ApiResponse(200, user, "User found successfully")
        )

})

const getUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username) {
        throw new ApiError("Username is required");
    }

    const profile = await User.aggregate([
        {
            $match: {
                username: username
            }
        },
        {
            // get  user following
            $lookup: {
                from: "follows",
                foreignField: "followers",
                localField: "_id",
                as: "followings"
            }
        },
        {
            // get user followers
            $lookup: {
                from: "follows",
                foreignField: "followings",
                localField: '_id',
                as: "followers"
            }
        },
        {
            $addFields: {

                // count user following if null then return epmty array
                followingsCount: {
                    $size: { $ifNull: ["$followings", []] }
                },

                // count user followers if null then return epmty array
                followersCount: {
                    $size: { $ifNull: ["$followers", []] }
                },

                // check current user follow this profile 
                // if current user id exsit to $followers.followers document then isFollowed true
                // otherwise false
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
                isFollowed: 1,
                createdAt: 1
            }
        }
    ])

    if (!profile.length) {
        throw new ApiError(404, "Profile not found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, profile[0], "User Profiule Fetched Successfully")
        )

})

const getAllUsers = asyncHandler(async (req, res) => {
    // get user following
    // if user following some user than find
    // those user which is not preset in  current user followings list
    // if user does not following any user than find 
    // all users not only login user

    const userFollowings = await Follows.find({ followers: req.user._id })
    userFollowings.push({ followings: req.user._id })

    const followingIds = userFollowings.map((follow) => follow.followings)

    let users;

    if (userFollowings.length > 0) {
        // find those user which is not in followingIds
        users = await User.find({ _id: { $nin: followingIds } }).select("-password")
    } else {
        users = await User.find({ _id: { $nin: req.user._id } }).select("-password")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, users, "All Users Found Successfully")
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