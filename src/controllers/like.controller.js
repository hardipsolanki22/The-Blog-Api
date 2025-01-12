import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { Like } from '../models/like.model.js';
import { Post } from '../models/post.models.js';
import { Comment } from '../models/comment.model.js';
import { Tweet } from '../models/tweet.model.js'
import mongoose, { isValidObjectId } from 'mongoose';

const likeDislikePost = asyncHandler(async (req, res) => {

    const postId = req.params.postId

    if (!postId) {
        throw new ApiError(400, "post id is require")
    }

    const post = await Post.findById(postId)

    if (!post) {
        throw new ApiError(404, "post not found")
    }
    const userAlreadyLiked = await Like.findOne({
        $and: [{ post: post._id }, { likedBy: req.user?._id }]
    })

    if (!userAlreadyLiked) {

        await Like.create({
            post: post._id,
            likedBy: req.user?._id
        })

        return res.status(200)
            .json(
                new ApiResponse(200, { like: true }, "Like Successfully")
            )
    } else {

        await Like.findOneAndDelete({
            $and: [{ post: post._id }, { likedBy: req.user._id }]
        })

        return res.status(200)
            .json(
                new ApiResponse(200, { like: false }, "Unliked Successfully")
            )
    }
})

const getPostLikes = asyncHandler(async (req, res) => {
    const { postId } = req.params
    const { page = 1, limit = 3 } = req.query


    if (!postId) {
        throw new ApiError(400, "post id is required")
    }

    const post = await Post.findById(postId)

    if (!post) {
        throw new ApiError(404, "Post not found")
    }

    const skip = parseInt(limit) * (parseInt(page) - 1)


    const currentUserId = req.user._id

    const postLikesDetails = await Like.aggregate([
        {
            $match: {
                post: new mongoose.Types.ObjectId(post._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "likedBy",
                foreignField: "_id",
                as: "likedByUsers",
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
                                    if: { $in: [currentUserId, "$userFollowers.followers"] },
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
                likedBy: {
                    $first: "$likedByUsers"
                }
            }

        },
        {
            $project: {
                likedBy: 1,
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $limit: parseInt(limit)
        },
        {
            $skip: skip
        },
    ])

    return res.status(200)
        .json(
            new ApiResponse(200, postLikesDetails, "post like found successfully")
        )

})

const likeDislikeComment = asyncHandler(async (req, res) => {

    // comment id
    // comment is not found then throw error
    // check if comment like is exsist or not 
    // if comment like is exist then delete comment like
    // if comment like is not exist then create new comment

    const { commentId } = req.params

    const like = req.query.type;
    console.log(`likeQuery: ${like}`);

    if (!commentId) {
        throw new ApiError(400, "comment id is require")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "comment not found")
    }


    if (like === "LIKE") {

        const userAlreadyLiked = await Like.findOne({
            $and: [{ like: "LIKE" }, { comment: comment._id }, { likedBy: req.user._id }]
        })

        if (!userAlreadyLiked) {

            await Like.create({
                like,
                comment: comment._id,
                likedBy: req.user._id
            })

            await Like.deleteOne({
                like: "DISLIKE",
                comment: comment._id,
                likedBy: req.user._id
            })

            return res.status(200)
                .json(
                    new ApiResponse(
                        200,
                        {
                            commentLike: true
                        },
                        "Liked Successfully"
                    )
                )

        } else {

            await Like.findOneAndDelete({
                $and: [{ like: "LIKE" }, { comment: comment._id }, { likedBy: req.user._id }]
            })

            return res.status(200)
                .json(
                    new ApiResponse(
                        200,
                        {
                            commentLike: false
                        },
                        "Unliked Successfully"
                    )
                )
        }
    } else if (like === "DISLIKE") {

        const userAlreadyLiked = await Like.findOne({
            $and: [{ like: "DISLIKE" }, { comment: comment._id }, { likedBy: req.user._id },]
        })

        if (!userAlreadyLiked) {

            await Like.create({
                like,
                comment: comment._id,
                likedBy: req.user._id
            })

            await Like.deleteOne({
                like: "LIKE",
                comment: comment._id,
                likedBy: req.user._id
            })

            return res.status(200)
                .json(
                    new ApiResponse(200, { commentDisLike: true }, "Like Successfully")
                )

        } else {

            await Like.deleteOne({
                $and: [{ like: "DISLIKE" }, { comment: comment._id }, { likedBy: req.user._id }]
            })

            return res.status(200)
                .json(
                    new ApiResponse(200, { commentDisLike: false }, "Unlike Successfully")
                )
        }

    } else {
        throw new ApiError(400, "Invalide Like Type")
    }
})

const getCommentLikeDislikeCount = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "comment id is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    const likeDislikeCount = await Like.aggregate([
        {
            $match: {
                comment: new mongoose.Types.ObjectId(comment._id)
            }
        },
        {
            $group: {
                _id: "$comment",
                totalLikes: {
                    $sum: {
                        $cond: [{ $eq: ["$like", "LIKE"] }, 1, 0]
                    }
                },
                totalDislikes: {
                    $sum: {
                        $cond: [{ $eq: ["$like", "LIKE"] }, 1, 0]
                    }
                }
            }
        }
    ]);

    if (likeDislikeCount.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, { totalLikes: 0, totalDislikes: 0 }, "No likes or dislikes found")
        );
    }

    return res.status(200).json(
        new ApiResponse(200, likeDislikeCount[0], "Comment like and dislike count found successfully")
    );
});

const likeDislikeTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params
    const { type } = req.query

    if (!tweetId) {
        throw new ApiError(400, "Tweet id is required")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if (type === 'LIKE') {

        const isTweetLike = await Like.findOne({
            tweet: tweet._id,
            like: 'LIKE',
            likedBy: req.user._id
        })

        if (!isTweetLike) {

            await Like.create({
                like: 'LIKE',
                tweet: tweet._id,
                likedBy: req.user._id
            })

            await Like.findOneAndDelete({
                like: 'DISLIKE',
                tweet: tweet._id,
                likedBy: req.user._id
            })

            return res.status(200)
                .json(
                    new ApiResponse(
                        200,
                        {
                            tweetLike: true
                        },
                        "Tweet like successfully"
                    )
                )
        } else {

            await Like.findOneAndDelete({
                like: 'LIKE',
                tweet: tweet._id,
                likedBy: req.user._id
            })

            return res.status(200)
                .json(
                    new ApiResponse(
                        200,
                        {
                            tweetLike: false
                        },
                        "Tweet Unlike successfully"
                    )
                )
        }


    } else if (type === 'DISLIKE') {

        const isTweetDisLike = await Like.findOne({
            tweet: tweet._id,
            like: 'DISLIKE',
            likedBy: req.user._id
        })

        if (!isTweetDisLike) {

            await Like.create({
                like: 'DISLIKE',
                tweet: tweet._id,
                likedBy: req.user._id
            })

            await Like.findOneAndDelete({
                like: 'LIKE',
                tweet: tweet._id,
                likedBy: req.user._id
            })

            return res.status(200)
                .json(
                    new ApiResponse(
                        200,
                        {
                            tweetDisLike: true
                        },
                        "Tweet like successfully"
                    )
                )
        } else {

            await Like.findOneAndDelete({
                like: 'DISLIKE',
                tweet: tweet._id,
                likedBy: req.user._id
            })

            return res.status(200)
                .json(
                    new ApiResponse(
                        200,
                        {
                            tweetDisLike: false
                        },
                        "Tweet Unlike successfully"
                    )
                )
        }

    } else {
        throw new ApiError(400, "Invalide Like Type")
    }

})


export {
    likeDislikePost,
    likeDislikeComment,
    getPostLikes,
    getCommentLikeDislikeCount,
    likeDislikeTweet
};

