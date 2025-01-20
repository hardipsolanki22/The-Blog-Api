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
    // check if current user like exsit
    const userAlreadyLiked = await Like.findOne({
        $and: [{ post: post._id }, { likedBy: req.user?._id }]
    })

    if (!userAlreadyLiked) {

        // if not exsit then create post like document
        await Like.create({
            post: post._id,
            likedBy: req.user?._id
        })

        return res.status(200)
            .json(
                new ApiResponse(200, { like: true }, "Like Successfully")
            )
    } else {
        // if exsit then delete post like document
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

    // pagination
    const skip = parseInt(limit) * (parseInt(page) - 1)

    const currentUserId = req.user._id

    const postLikesDetails = await Like.aggregate([
        {
            $match: {
                post: new mongoose.Types.ObjectId(post._id)
            }
        },
        {
            // get likedBy user avatar and username
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
                    // get likedBy user followers
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
                            // check current user follow this likedBy user 
                            // if current user id exsit to $userFollowers.followers document then isFollowed true
                            // otherwise false
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
                // get first value of $likedByUsers document
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
        // pagination
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

    if (!commentId) {
        throw new ApiError(400, "comment id is require")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "comment not found")
    }


    if (like === "LIKE") {

        // check current user like on comment
        const userAlreadyLiked = await Like.findOne({
            $and: [{ like: "LIKE" }, { comment: comment._id }, { likedBy: req.user._id }]
        })

        if (!userAlreadyLiked) {

            // if like is exist then create like document 
            await Like.create({
                like,
                comment: comment._id,
                likedBy: req.user._id
            })

            //if dislike is exsit on comment then delete dislike
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
            // if like is exist then delete like document
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

        // check current user dislike exist
        const userAlreadyLiked = await Like.findOne({
            $and: [{ like: "DISLIKE" }, { comment: comment._id }, { likedBy: req.user._id },]
        })

        if (!userAlreadyLiked) {
            // if  dislike is not exist then  create dislike document
            await Like.create({
                like,
                comment: comment._id,
                likedBy: req.user._id
            })
            // if like is exist then delete like document on comment
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
            // if dislike is exist them delete dislike document
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

        // check cuttent user like is exist on tweet
        const isTweetLike = await Like.findOne({
            tweet: tweet._id,
            like: 'LIKE',
            likedBy: req.user._id
        })

        if (!isTweetLike) {

            // if like is not exist then create like document
            await Like.create({
                like: 'LIKE',
                tweet: tweet._id,
                likedBy: req.user._id
            })

            // if dislike is exist on tweet then delete like document
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

            // if like is exist then delete like document
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

        // check current user dislike on tweet
        const isTweetDisLike = await Like.findOne({
            tweet: tweet._id,
            like: 'DISLIKE',
            likedBy: req.user._id
        })

        if (!isTweetDisLike) {

            // if dislike is not exist then create dislike document 
            await Like.create({
                like: 'DISLIKE',
                tweet: tweet._id,
                likedBy: req.user._id
            })

            // if like is exist then delete like document
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

            // if dislike is exist then delete dislike on tweet
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
    likeDislikeTweet
};

