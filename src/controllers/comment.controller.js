import { asyncHandler } from '../utils/asyncHandler.js';
import { Post } from '../models/post.models.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Comment } from '../models/comment.model.js';
import mongoose from 'mongoose';
import { Like } from '../models/like.model.js';

const createComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { postId } = req.params;

    if (!(content || postId)) {
        throw new ApiError(400, "All filed are require")
    }

    const post = await Post.findById(postId)

    if (!post) {
        throw new ApiError(404, "Post not found")
    }

    // create comment document
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

    // pagination
    const { page = 1, limit = 10 } = req.query

    if (!postId) {
        throw new ApiError(400, "post id is require")
    }

    const post = await Post.findById(postId)

    if (!post) {
        throw new ApiError(400, "post not found")
    }

    // get comment likes and dislikes
    const comments = await Comment.aggregate([
        {
            $match: {
                post: new mongoose.Types.ObjectId(post._id)
            }
        },
        {
            // get commet likes
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "commentLikes",
                // pipline for get only likes on comment
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
            // get commet dislikes
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "commentDislikes",
                // pipline for get only dislikes on comment
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
                // pipline for match only LIKE and current user id in document
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
                // pipline for match only DISLIKE and current user id in document

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
            // pipline for get owner details (avatar and username)
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

                // get fisrt value  of $commentOwner document
                owner: {
                    $first: "$commentOwner"
                },

                // count comment likes if likes is null then return empty arra
                commentlikesCount: {
                    $size: { $ifNull: ["$commentLikes", []] }
                },

                // count comment likes if likes is null then return empty arra
                commentDislikesCount: {
                    $size: { $ifNull: ["$isCommentDislikes", []] }
                },
                // if isCommentLikes document greater than or equal to 1 then isLikes is true otherwise false
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
                // if isCommentLikes document greater than or equal to 1 then isLikes is true otherwise false
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
                isCommentDisLike: 1,
                createdAt: 1

            }
        },
        // pagination
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

    // update comment document
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

    const comment = await Comment.findById(id)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    //delete comment likes and disliked
    await Like.deleteMany({comment: comment._id})

    // delete comment
     await Comment.findByIdAndDelete(comment._id)
     
    return res.status(200)
        .json(
            new ApiResponse(200, {}, "comment delete successfully")
        )
})


export {
    createComment,
    getPostComment,
    updateComment,
    deleteComment,
}

