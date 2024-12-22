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
    const { title, description, status } = req.body

    if ([title, description].some((filed) => filed?.trim() === '')) {
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
        description,
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
    const title = req.body?.title
    const description = req.body?.description
    const status = req.body?.status
    const { postId } = req.params

    console.log(`Title: ${title}`);
    console.log(`Description: ${description}`);
    console.log(`Status: ${status}`);


    if (!postId) {
        throw new ApiError(400, "post id is require")
    }

    const post = await Post.findByIdAndUpdate(
        postId,
        {
            $set: {
                title,
                description,
                status
            }
        },
        { new: true }
    )

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

    const posts = await Post.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
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
                }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                image: 1,
                status: 1,
                likesCount: 1,
                commentsCount: 1
            }
        }
    ])

    return res.status(200)
        .json(
            new ApiResponse(200, posts, "user all post found suuceesfully")
        )



})

const getFollowingsUserPost = asyncHandler(async (req, res) => {

    const page = parseInt(req.query.page)
    const limit = parseInt(req.query.limit)

    const skip = limit * (page - 1)

    const userPosts = await Follows.aggregate([
        {
            $sort: { title: 1 }
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        {
            $match: {
                followers: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "posts",
                localField: "followings",
                foreignField: "owner",
                as: "followingsUserPosts",
                pipeline: [
                    {
                        $match: {
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
                            }
                        }
                    },
                    {
                        $project: {
                            user: 0,
                            likes: 0,
                            comments: 0
                        }
                    },
                ]
            }
        },
        {
            $project: {
                followingsUserPosts: 1,
                likesCount: 1,
                commentsCount: 1
            }
        }

    ])

    if (!userPosts.length) {
        throw new ApiError(404, "user does not following any users")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, userPosts[0].followingsUserPosts, "followings user posts found successfully")
        )
})

const getPostLikes = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if (!postId) {
        throw new ApiError(400, "Post id is required")
    }

    const post = await Post.findById(postId)

    if (!post) {
        throw new ApiError(404, "Post is not found")
    }

    const postLikesDetails = await Post.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(post._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "postLikes",
                pipeline: [
                    {
                        $project: {
                            post: 0
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
                                        foreignField: "followigs",
                                        as: "userFollowings"
                                    }
                                },
                                {
                                    $addFields: {
                                        isFollow: {
                                            $cond: {
                                                if: { $in: [req.user._id, "$userFollowings.followers"] },
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
                            likedBy: {
                                $first: "$likedByUsers"
                            },
                        }
                    },
                    {
                        $project: {
                            likedByUsers: 0
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                isLiked: {
                    $cond: {
                        if: { $in: [req.user._id, "$postLikes.likedBy._id"] },
                        then: true,
                        else: false
                    }
                },
            }
        },
        {
            $project: {
                postLikes: 1,
                isLiked: 1,

            }
        }
    ])

    return res.status(200)
        .json(
            new ApiResponse(200, postLikesDetails[0], "Post likes found successfully")
        )



})

const getAllPosts = asyncHandler(async (req, res) => {

    const { page = 1, limit = 5 } = req.query

    const skip = [limit] * ([page] - 1)

    // const page = parseInt(req.query.page)
    // const limit = parseInt(req.query.limit)

    // const skip = limit * (page - 1);

    const posts = await Post.aggregate([
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
        {
            $match: {
                owner: { $ne: new mongoose.Types.ObjectId(req.user?._id) },
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
                        if: { $in: [req.user._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                image: 1,
                status: 1,
                owner: 1,
                likesCount: 1,
                commentsCount: 1,
                isLike: 1
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, posts, "All Posts found successfully")
    );

})

const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params

    if (!postId) {
        throw new ApiError(400, "post id is require")
    }

    const post = await Post.findById(postId)

    if (!post) {
        throw new ApiError(404, "Post not found")
    }

    await Post.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(post._id)
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
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "comments"
            }
        }
    ])

    return res.status(200)
        .json(
            new ApiResponse(200, {}, "delete post successfully")
        )
})

export {
    createPost,
    getPost,
    updatePost,
    getUserAllPost,
    getFollowingsUserPost,
    getPostLikes,
    getAllPosts,
    deletePost,
}