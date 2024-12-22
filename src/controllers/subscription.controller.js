import { Follows } from "../models/followersFollowings.modles.js";
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import mongoose from "mongoose";
import { User } from '../models/user.model.js';

const followUnfollowUser = asyncHandler(async (req, res) => {

    const { userId } = req.params

    console.log(`userId: ${userId}`);
    console.log(`loginUser: ${req.user._id}`);


    if (!userId) {
        throw new ApiError(400, "user id is required")
    }

    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const userHasAlreadyFollow = await Follows.findOne({
        $and: [{ followers: req.user?._id }, { followings: userId }]
    })

    if (!userHasAlreadyFollow) {

        await Follows.create({
            followers: req.user?._id,
            followings: userId
        })

        return res.status(200)
            .json(
                new ApiResponse(200, { following: true }, "Following Successfully")
            )
    } else {

        await Follows.findOneAndDelete({
            $and: [{ followers: req.user._id }, { followings: userId }]
        })

        return res.status(200)
            .json(
                new ApiResponse(200, { following: false }, "Un-followed Successfully")
            )
    }

})

const getUserFollowigns = asyncHandler(async (req, res) => {
    
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!userId) {
        throw new ApiError(400, "user id is required");
    }
    const userDetails = await Follows.aggregate([
        {
            $skip: limit * (page - 1)
        },
        {
            $limit: limit
        },
        {
            $match: {
                followers: new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "followings",
                foreignField: "_id",
                as: "followDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    },
                    {
                        $lookup: {
                            from: "follows",
                            localField: "_id",
                            foreignField: "followings",
                            as: "userFollowers"
                        }
                    },
                    {
                        $addFields: {
                            isFollowed: {
                                $cond: {
                                    if: { $in: [req.user._id, "$userFollowers.followers"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            userFollowers: 0
                        }
                    }
                ]
            }
        },
        {
            $project: {
                followDetails: 1,
                isFollowed: 1
            }
        }
    ]);


    return res.status(200).json(
        new ApiResponse(200, userDetails, "user followings found successfully")
    )


})

const getUserFollowers = asyncHandler(async (req, res) => {

    const { userId } = req.params
    const {page = 1, limit = 10} = req.query


    if (!userId) {
        throw new ApiError(400, "user id is required");
    }
    const userDetails = await Follows.aggregate([
        {
            $skip: limit * (page - 1)
        },
        {
            $limit: limit
        },
        {
            $match: {
                followings: new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "followers",
                foreignField: "_id",
                as: "followDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    },
                    {
                        $lookup: {
                            from: "follows",
                            localField: "_id",
                            foreignField: "followings",
                            as: "userFollowers"
                        }
                    },
                    {
                        $addFields: {
                            isFollowed: {
                                $cond: {
                                    if: { $in: [req.user._id, "$userFollowers.followers"]},
                                    then: true,
                                    else: false
                                }
                            },
                        }
                    },
                    {
                        $project: {
                            userFollowers: 0   
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                followDetails: {
                    $first: "$followDetails"
                }
            }
        },
            {
            $project: {
                followDetails: 1,
                isFollowed: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, userDetails, "user followers found successfully")
    );

})

const getFollowStatus = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username) {
        throw new ApiError(400, "username is requires")
    }

    const user = await User.findOne({ username })

    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const userIsFollow = await Follows.findOne({
        $and: [{ followings: user?._id }, { followers: req.user?._id }]
    })

    if (userIsFollow) {
        return res.status(200)
            .json(
                new ApiResponse(200, {following: true}, "User Following Status")
            )
    } else {
        return res.status(200)
            .json(
                new ApiResponse(200, {following: false}, "User Following Status")
            )
    }
})







export {
    followUnfollowUser,
    getUserFollowigns,
    getUserFollowers,
    getFollowStatus,
}