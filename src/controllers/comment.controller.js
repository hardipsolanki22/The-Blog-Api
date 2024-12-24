import { asyncHandler } from '../utils/asyncHandler.js';
import { Post } from '../models/post.models.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Comment } from '../models/comment.model.js';
import mongoose from 'mongoose';

const createComment = asyncHandler(async (req, res) => {
    const { content, postId } = req.body;

    if (!(content || postId)) {
        throw new ApiError(400, "All filed are require")
    }

    const post = await Post.findById(postId)

    if (!post) {
        throw new ApiError(404, "Post not found")
    }

    const createComment = await Comment.create({
        content,
        post: post._id,
        owner: req.user?._id
    })

    const comment = await Comment.findById(createComment._id)

    if (!comment) {
        throw new ApiError(500, "Internal server error...")
    }

    return res.status(201)
        .json(
            new ApiResponse(201, comment, "comment create successfully")
        )
})

const getPostComment = asyncHandler(async (req, res) => {
    const { postId } = req.params

    const { page = 1, limit = 10 } = req.query

    if (!postId) {
        throw new ApiError(400, "post id is require")
    }

    const post = await Post.findById(postId)

    if (!post) {
        throw new ApiError(400, "post not found")
    }

    const comments = await Comment.aggregate([
        {
            $sort: {
                content: 1
            }
        },
        {
            $skip: limit * (page - 1)
        },
        {
            $limit: parseInt(limit)
        },
        {
            $match: {
                post: new mongoose.Types.ObjectId(post._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "commentLikes",
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
                foreignField: "comment",
                as: "commentDislikes",
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
                foreignField: "comment",
                as: "isCommentLikes",
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "isCommentDislikes",
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
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "commentOwner",
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
            $addFields: {
                owner: {
                    $first: "$commentOwner"
                },
                commentlikesCount: {
                    $size: { $ifNull: ["$commentLikes", []] }
                },

                commentDislikesCount: {
                    $size: { $ifNull: ["$isCommentDislikes", []] }
                },

                isCommentLike: {
                    $cond: {
                        if: {
                            $gte: [
                                {
                                    $size: "$isCommentLikes"
                                },
                                1
                            ]
                        },
                        then: true,
                        else: false
                    }
                },

                isCommentDisLike: {
                    $cond: {
                        if: {
                            $gte: [
                                {
                                    $size: "$isCommentDislikes"
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
                commentlikesCount: 1,
                commentDislikesCount: 1,
                isCommentLike: 1,
                isCommentDisLike: 1

            }
        }
    ])

    if (!comments.length) {
        return res.status(200)
            .json(
                new ApiResponse(200, {}, "no comment in this post")
            )
    }

    return res.status(200)
        .json(
            new ApiResponse(200, comments, "comment found succesfully")
        )

})

const updateComment = asyncHandler(async (req, res) => {
    const { id } = req.params

    const content = req.body.content

    if (!content) {
        throw new ApiError(400, "content is ruquire")
    }

    const comment = await Comment.findByIdAndUpdate(id,
        {
            $set: {
                content
            }
        },
        { new: true }
    )

    return res.status(200)
        .json(
            new ApiResponse(200, comment, "comment update successfully")
        )


})

const deleteComment = asyncHandler(async (req, res) => {
    const { id } = req.params

    if (!id) {
        throw new ApiError(400, "comment id is require")
    }

    const comment = await Comment.findByIdAndDelete(id)

    return res.status(200)
        .json(
            new ApiResponse(200, comment, "comment delete successfully")
        )
})


export {
    createComment,
    getPostComment,
    updateComment,
    deleteComment,
}

