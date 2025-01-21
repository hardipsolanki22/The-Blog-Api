import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose from "mongoose";
import { Like } from "../models/like.model.js";

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    // crate tweet document
    const createTweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    const tweet = await Tweet.findById(createTweet._id)

    if (!tweet) {
        throw new ApiError(500, "Internal server error")
    }

    return res.status(201)
        .json(
            new ApiResponse(201, tweet, "Tweet create successfully")
        )

})

const getTweets = asyncHandler(async (req, res) => {

    const { page = 1, limit = 4 } = req.query

    //  pagination logik
    const skip = limit * (page - 1)

    const tweet = await Tweet.aggregate([
        {
            // get owner details (username , avatar)
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            // get tweet likes
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "tweetLikes",
                pipeline: [
                    {
                        $match: {
                            like: "LIKE"
                        }
                    }
                ]
            }
        },
        {
            // get tweet dislike
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "tweetDisLikes",
                pipeline: [
                    {
                        $match: {
                            like: "DISLIKE"
                        }
                    }
                ]
            }
        },
        {
            // get current user like on tweet
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "isTweetLikes",
                pipeline: [
                    {
                        $match: {
                            like: "LIKE",
                            likedBy: new mongoose.Types.ObjectId(req.user._id)
                        }
                    }
                ]
            }
        },
        {
            // get current user dislike on tweet
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "isTweetDisLikes",
                pipeline: [
                    {
                        $match: {
                            like: "DISLIKE",
                            likedBy: new mongoose.Types.ObjectId(req.user._id)
                        }
                    }
                ]
            }
        },
        {
            $addFields: {

                // get fist value of $owner document
                owner: {
                    $first: "$owner"
                },

                // count tweet likes if null then return empyu array
                tweetLikeCount: {
                    $size: {
                        $ifNull: [
                            "$tweetLikes",
                            []
                        ]
                    }
                },

                // count tweet dislike if null then return empyu array
                tweetDisLikeCount: {
                    $size: {
                        $ifNull: [
                            "$tweetDisLikes",
                            []
                        ]
                    }
                },

                // if isTweetLikes document greater than or equal to 1 then isLikes is true otherwise false
                isTweetLike: {
                    $cond: {
                        if: {
                            $gte: [
                                {
                                    $size: "$isTweetLikes"
                                },
                                1
                            ]
                        },
                        then: true,
                        else: false
                    }
                },

                // if isTweetDisLikes document greater than or equal to 1 then isLikes is true otherwise false
                isTweetDisLike: {
                    $cond: {
                        if: {
                            $gte: [
                                {
                                    $size: "$isTweetDisLikes"
                                },
                                1
                            ]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                content: 1,
                owner: 1,
                isTweetLike: 1,
                isTweetDisLike: 1,
                tweetLikeCount: 1,
                tweetDisLikeCount: 1,
                createdAt: 1
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
        }
    ])

    return res.status(200)
        .json(
            new ApiResponse(200, tweet, "post found successfully")
        )
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!tweetId) {
        throw new ApiError(400, "Tweet id res required")
    }

    // delete tweet like and dislike
    await Like.deleteMany({ tweet: tweetId })
    // delete tweet
    await Tweet.findByIdAndDelete(tweetId)

    res.status(200)
        .json(
            new ApiResponse(200, {}, "Tweet delete successfully")
        )

})

export {
    createTweet,
    getTweets,
    deleteTweet
}