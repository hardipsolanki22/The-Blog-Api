import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose from "mongoose";

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body

    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    const createTweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    const tweet = await Tweet.findById(createTweet._id)

    if (!tweet) {
        throw new ApiError(500, "Internal server error")
    }

    return res.status(200)
                .json(
                    new ApiResponse(200, tweet, "Tweet create successfully")
                )

} )

const getTweets = asyncHandler(async (req, res) => {

    const {page = 1, limit = 4} = req.query

    const skip = limit * (page- 1)

    const tweet = await Tweet.aggregate([
        {
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "isTweetLikes",
                pipeline: [
                    {
                        $match: {
                            like: "LIKE",
                            likedBy : new mongoose.Types.ObjectId(req.user._id)
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "isTweetDisLikes",
                pipeline: [
                    {
                        $match: {
                            like: "DISLIKE",
                            likedBy : new mongoose.Types.ObjectId(req.user._id)
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first :"$owner"
                },
                tweetLikeCount: {
                    $size: {
                        $ifNull: [
                            "$tweetLikes",
                            []
                        ]
                    }
                },
                tweetDisLikeCount: {
                    $size: {
                        $ifNull: [
                            "$tweetDisLikes",
                            []
                        ]
                    }
                },
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
                tweetDisLikeCount: 1
            }
        },
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