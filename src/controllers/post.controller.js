import { Post } from '../models/post.models.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { destroyCloudinary, uploadCloudinary } from '../utils/Cloudinary.js'
import { User } from '../models/user.model.js'
import mongoose from 'mongoose'
import { Follows } from '../models/followersFollowings.modles.js'
import { Like } from '../models/like.model.js'
import { Comment } from '../models/comment.model.js'



const createPost = asyncHandler(async (req, res) => {
    const { title, content, status } = req.body

    if ([title, content].some((filed) => filed?.trim() === '')) {
        throw new ApiError(400, "All filed required")
    }

    const imageLocalPath = req.file?.path

    if (!imageLocalPath) {
        throw new ApiError(400, "Image is required")
    }

    const image = await uploadCloudinary(imageLocalPath)

    if (!image) {
        throw new ApiError(500, "Internal server error while uploading image")
    }

    const user = await User.findById(req.user._id)

    // create post document
    const createPost = await Post.create({
        title,
        content,
        owner: user._id,
        status: status || "active",
        image
    })

    const post = await Post.findById(createPost._id)

    if (!post) {
        throw new ApiError(500, "Internal server error")
    }

    return res.status(201)
        .json(
            new ApiResponse(201, post, "Post Created Successfully")
        )

})

const getPost = asyncHandler(async (req, res) => {
    const { postId } = req.params

    if (!postId) {
        throw new ApiError(400, "Post id required")
    }

    // get post and populate owner filed to get username
    const post = await Post.findById(postId).populate("owner", "username")

    if (!post) {
        throw new ApiError(404, "Post not found")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, post, "Post Fetched Successfully")
        )
})

const updatePost = asyncHandler(async (req, res) => {
    const { title, content, status } = req.body
    const { postId } = req.params

    if (!title || !content) {
        throw new ApiError(400, "At least one field is required")
    }

    if (!postId) {
        throw new ApiError(400, "Post id required")
    }

    // update post and populate owner filed to get username
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
        throw new ApiError(404, "Post not found")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, post, "Post Updated Successfully")
        )



})

const getUserAllPost = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!userId) {
        throw new ApiError(400, "User id required")
    }

    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const { page = 1, limit = 3 } = req.query

    // pagination 
    const skip = parseInt(limit) * (parseInt(page) - 1)



    const posts = await Post.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user._id)
            }
        },
        {
            // get likes on post
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "likes"
            }
        },
        {
            // get current user like on comment
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "isUserLiked",
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
            // get comments on post
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "comments"
            }
        },
        {
            $addFields: {

                // count post likes if null then retuen []
                likesCount: {
                    $size: "$likes"
                },

                // count post comments if null then retuen []
                commentsCount: {
                    $size: { $ifNull: ["$comments", []] }
                },
                // if $isUserLiked document greater than or equal to 1 then isLiked is true otherwise false
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
                isUserLiked: 1,
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
        // paginarion
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
            new ApiResponse(200, posts, "All Post Fetched Successfully")
        )



})

const getFollowingsUserPost = asyncHandler(async (req, res) => {

    const { page = 1, limit = 5 } = req.query

    // pagination
    const skip = parseInt(limit) * (parseInt(page) - 1)

    // get current user following
    const followings = await Follows.find({ followers: req.user._id })
        .select("-followers")

    // get perticular id in array
    const followingIds = followings?.map(follow => follow.followings)


    const posts = await Post.aggregate([
        {
            $match: {
                owner: { $in: followingIds },
                status: "active"
            }
        },
        {
            // get owner details (username and avatar)
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
            // get post likes
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "likes"
            },
        },
        {
            // get current user like on post
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
            // get comments on post
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "comments"
            }
        },
        {
            $addFields: {

                // get fiest value of $user document
                owner: {
                    $first: "$user"
                },

                // count post likes if null then retuen []
                likesCount: {
                    $size: { $ifNull: ["$likes", []] }
                },

                // count post comment if null then retuen []
                commentsCount: {
                    $size: { $ifNull: ["$comments", []] }
                },

                // if $isLike document greater than or equal to 1 then isLike is true otherwise false
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
                isLike: 1,
                createdAt: 1
            }
        },
        // pagination
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
            new ApiResponse(200, posts, "Posts Fetched Successfully")
        )
})

const getAllPosts = asyncHandler(async (req, res) => {

    const { page = 1, limit = 3 } = req.query

    // pagination
    const skip = parseInt(limit) * (parseInt(page) - 1)

    // get current user following
    const followings = await Follows.find({ followers: req.user._id }).
        select('followings');

    // get perticular id in array
    const followingIds = followings.map(follow => follow.followings);

    const posts = await Post.aggregate([
        {
            $match: {
                owner: { $nin: followingIds },
                status: "active"

            }
        },
        {
            // get likes on post
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "likes"
            }
        },
        {
            // get current user like in post
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
            // get post comment
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "comments"
            }
        },
        {
            // get owner details (avatar and username)
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

                // get first value of $user document
                owner: {
                    $first: "$user"
                },

                // count post likes if null then retuen empty array
                likesCount: {
                    $size: {
                        $ifNull: [
                            "$likes",
                            []
                        ]
                    }
                },
                // count post comments if null then retuen empty array
                commentsCount: {
                    $size: {
                        $ifNull: [
                            "$comments",
                            []
                        ]
                    }
                },

                // if $isLiked document greater than or equal to 1 then isLike is true otherwise false
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
                isLike: 1,
                createdAt: 1

            }
        },
        // pagination
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
        new ApiResponse(200, posts, "All Posts Fetched Successfully")
    );

})

const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params

    if (!postId) {
        throw new ApiError(400, "Post id required")
    }

    const post = await Post.findById(postId)

    if (!post) {
        throw new ApiError(404, "Post not found")
    }


    // delete post like 
    await Like.deleteMany({ post: post._id })

    // delete post comment
    await Comment.deleteMany({ post: post._id })

    // delete image from cloudinary
    await destroyCloudinary(post.image)

    // delete post
    await Post.findByIdAndDelete(post._id)


    res.status(200)
        .json(
            new ApiResponse(200, {}, "Delete Post Succesfully")
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