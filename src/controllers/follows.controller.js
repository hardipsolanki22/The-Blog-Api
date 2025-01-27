import { Follows } from "../models/followersFollowings.modles.js";
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import mongoose from "mongoose";
import { User } from '../models/user.model.js';

const followUnfollowUser = asyncHandler(async (req, res) => {

    const { userId } = req.params

    if (!userId) {
        throw new ApiError(400, "User id required")
    }

    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    // check current user follow to this user
    const userHasAlreadyFollow = await Follows.findOne({
        $and: [{ followers: req.user?._id }, { followings: userId }]
    })

    if (!userHasAlreadyFollow) {

        // if current user is not following then create following document
        await Follows.create({
            followers: req.user?._id,
            followings: userId
        })

        return res.status(201)
            .json(
                new ApiResponse(201, { following: true }, "Following Successfully")
            )
    } else {

        // if current user is following then delete following document
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

    // pagination
    const skip = parseInt(limit) * (parseInt(page) - 1)

    if (!userId) {
        throw new ApiError(400, "User id required");
    }
    const userDetails = await Follows.aggregate([
        {
            $match: {
                followers: new mongoose.Types.ObjectId(userId),
            }
        },
        {
            // get following user details (username ...etc)
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
                        // get following user followers
                        $lookup: {
                            from: "follows",
                            localField: "_id",
                            foreignField: "followings",
                            as: "userFollowers"
                        }
                    },
                    {
                        $addFields: {
                            // check current user follow this following user
                            // if current user id is exist to this $userFollowers.followers document 
                            // then isFollwed is true otherwise false
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
            $addFields: {

                // get first valeu of $followDetails document
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
        },
        // pagination
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        },
    ]);


    return res.status(200).json(
        new ApiResponse(200, userDetails, "Followings Fetched Successfully")
    )


})

const getUserFollowers = asyncHandler(async (req, res) => {

    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query

    const skip = parseInt(limit) * (parseInt(page) - 1)

    if (!userId) {
        throw new ApiError(400, "User id required");
    }
    const userDetails = await Follows.aggregate([
        {
            $match: {
                followings: new mongoose.Types.ObjectId(userId),
            }
        },
        {
            // get followers user details (username ...etc)
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
                        // get follower of above followers user
                        $lookup: {
                            from: "follows",
                            localField: "_id",
                            foreignField: "followings",
                            as: "userFollowers"
                        }
                    },
                    {
                        $addFields: {
                            // check current user follow this follower user
                            // if current user id is exist to this $userFollowers.followers document 
                            // then isFollwed is true otherwise false

                            isFollowed: {
                                $cond: {
                                    if: { $in: [req.user._id, "$userFollowers.followers"] },
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

                // get first valeu of $followDetails document
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
        },

        // pagination
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        },
    ]);

    return res.status(200).json(
        new ApiResponse(200, userDetails, "Followers Fetched Successfully")
    );

})


export {
    followUnfollowUser,
    getUserFollowigns,
    getUserFollowers,
}