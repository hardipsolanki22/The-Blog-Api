import { Post } from '../models/post.models.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { uploadCloudinary } from '../utils/Cloudinary.js'
import { User } from '../models/user.model.js'
import mongoose from 'mongoose'
import { Follows } from '../models/followersFollowings.modles.js'
import { Like } from '../models/like.model.js'
import { Comment } from '../models/comment.model.js'



const createPost = asyncHandler(async (req, res) => {
    const { title, content, status = "active" } = req.body


    if ([title, content].some((filed) => filed?.trim() === '')) {
        throw new ApiError(400, "all filed are require")
    }

    const imageLocalPath = req.file?.path

    if (!imageLocalPath) {
        throw new ApiError(400, "Image is require")
    }

    const image = await uploadCloudinary(imageLocalPath)

    if (!image) {
        throw new ApiError(400, "Image is missing")
    }

    const user = await User.findById(req.user._id)

    const createPost = await Post.create({
        title,
        content,
        owner: user._id,
        status: status || "active",
        image
    })

    const post = await Post.findById(createPost._id)

    if (!post) {
        throw new ApiError(400, "Unauthorized requiest")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, post, "create post successfully")
        )

})

const getPost = asyncHandler(async (req, res) => {
    const { postId } = req.params

    if (!postId) {
        throw new ApiError(400, "post id is  require")
    }

    const post = await Post.findById(postId)

    if (!post) {
        throw new ApiError(404, "post not found")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, post, "post found successfully")
        )
})

const updatePost = asyncHandler(async (req, res) => {
    const { title, content, status } = req.body

    if (!title || !content) {
        throw new ApiError(400, "At least one field is required")
    }

    const { postId } = req.params

    if (!postId) {
        throw new ApiError(400, "post id is require")
    }

    const post = await Post.findByIdAndUpdate(
        postId,
        {
            $set: {
                title,
                content,
                status
            }
        },
        { new: true }
    ).populate("owner", "username")

    if (!post) {
        throw new ApiError(404, "post does not found")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, post, "update post successfully")
        )



})

const getUserAllPost = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!userId) {
        throw new ApiError(400, "user id is required")
    }

    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const { page = 1, limit = 3 } = req.query

    const skip = parseInt(limit) * (parseInt(page) - 1)



    const posts = await Post.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "isUserLiked",
                pipeline: [
                    {
                        $match: {
                            likedBy: new mongoose.Types.ObjectId(user._id)
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "comments"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                commentsCount: {
                    $size: { $ifNull: ["$comments", []] }
                },
                isLiked: {
                    $cond: {
                        if: {
                            $gte: [
                                {
                                    $first: "$isUserLiked"
                                },
                                1
                            ]
                        },
                        then: true,
                        else: false
                    }
                },
            }
        },
        {
            $project: {
                isLiked: 1,
                owner: 1,
                title: 1,
                content: 1,
                image: 1,
                status: 1,
                likesCount: 1,
                commentsCount: 1
            }
        },
        {
            $sort: {
                title: 1
            },
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        },
    ])

    return res.status(200)
        .json(
            new ApiResponse(200, posts, "user all post found suuceesfully")
        )



})

const getFollowingsUserPost = asyncHandler(async (req, res) => {

    const { page = 1, limit = 5 } = req.query

    const skip = parseInt(limit) * (parseInt(page) - 1)

    const followings = await Follows.find({ followers: req.user._id })
        .select("-followers")

    const followingIds = followings?.map(follow => follow.followings)


    const posts = await Post.aggregate([
        {
            $match: {
                owner: { $in: followingIds },
                status: "active"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "user",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "likes"
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "isLike",
                pipeline: [
                    {
                        $match: {
                            likedBy: new mongoose.Types.ObjectId(req.user._id)
                        }
                    }
                ]
            },
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "comments"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$user"
                },
                likesCount: {
                    $size: { $ifNull: ["$likes", []] }
                },
                commentsCount: {
                    $size: { $ifNull: ["$comments", []] }
                },
                isLike: {
                    $cond: {
                        if: {
                            $gte: [
                                {
                                    $first: "$isLike"
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
                title: 1,
                content: 1,
                image: 1,
                status: 1,
                owner: 1,
                likesCount: 1,
                commentsCount: 1,
                isLike: 1
            }
        },
        {
            $sort: { title: 1 }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        },

    ])


    return res.status(200)
        .json(
            new ApiResponse(200, posts, "followings user posts found successfully")
        )
})

const getAllPosts = asyncHandler(async (req, res) => {

    const { page = 1, limit = 3 } = req.query

    const skip = parseInt(limit) * (parseInt(page) - 1)

    const followings = await Follows.find({ followers: req.user._id }).
        select('followings');

    const followingIds = followings.map(follow => follow.followings);

    const posts = await Post.aggregate([
        {
            $match: {
                owner: { $nin: followingIds },
                status: "active"

            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "isLiked",
                pipeline: [
                    {
                        $match: {
                            likedBy: new mongoose.Types.ObjectId(req.user._id)
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "comments"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "user",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            },

        },
        {
            $addFields: {
                owner: {
                    $first: "$user"
                },
                likesCount: {
                    $size: {
                        $ifNull: [
                            "$likes",
                            []
                        ]
                    }
                },
                commentsCount: {
                    $size: {
                        $ifNull: [
                            "$comments",
                            []
                        ]
                    }
                },
                isLike: {
                    $cond: {
                        if: {
                            $gte: [
                                {
                                    $size: "$isLiked"
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
                title: 1,
                content: 1,
                image: 1,
                status: 1,
                owner: 1,
                likesCount: 1,
                commentsCount: 1,
                isLike: 1
            }
        },
        {
            $sort: {
                title: 1
            },
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        },
    ]);


    return res.status(200).json(
        new ApiResponse(200, posts, "All Posts found successfully")
    );

})

const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params

    if (!postId) {
        throw new ApiError(400, "post id is required")
    }

    const post = await Post.findById(postId)

    if (!post) {
        throw new ApiError(404, "post not found")
    }

    await Like.findOneAndDelete({ post: post._id })
    await Comment.findOneAndDelete({ post: post._id })
    await Post.findByIdAndDelete(post._id)

    //return

    res.status(200)
        .json(
            new ApiResponse(200, "post delete succesfully")
        )
})


export {
    createPost,
    getPost,
    updatePost,
    getUserAllPost,
    getFollowingsUserPost,
    getAllPosts,
    deletePost
}