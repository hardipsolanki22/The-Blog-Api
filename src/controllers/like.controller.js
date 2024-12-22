import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { Like } from '../models/like.model.js';
import { Post } from '../models/post.models.js';
import { Comment } from '../models/comment.model.js';
import mongoose, { isValidObjectId } from 'mongoose';

const likeDislikePost = asyncHandler(async (req, res) => {

    const postId = req.params.postId

    console.log(`postId: ${postId}`)

    if (!postId) {
        throw new ApiError(400, "post id is require")
    }

    const post = await Post.findById(postId)

    console.log(`post: ${post}`);


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

    if (!postId) {
        throw new ApiError(400, "post id is require")
    }

    const usersLiked = await Like.aggregate([
        {
            $match: {
                post: new mongoose.Types.ObjectId(postId)
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "likedBy",
                as: "likedByUser",
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
                            foreignField: "followings",
                            localField: "_id",
                            as: "userFollowings",
                        }
                    },
                    {
                        $addFields: {
                            isFollowed: {
                                $cond: {
                                    if: { $in: [req.user._id, "$userFollwings.followers"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            userFollowings: 0
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                //change field name
                likedBy: {
                    $first: "$likedByUser"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user._id, "$likedByUser._id"] },
                        then: true,
                        else: false
                    }
                },
            }
        },
        {
            $project: {
                likedBy: 1,
                isLiked: 1,
                // isFollowed: 1
            }
        }
    ])

    return res.status(200)
        .json(
            new ApiResponse(200, usersLiked, "likes user found successfull")
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

            return res.status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        isLiked: true
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
                        isLiked: false
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









export {
    likeDislikePost,
    likeDislikeComment,
    getPostLikes,

}
