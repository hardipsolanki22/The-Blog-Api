import express,{Router} from 'express'
import { verifyJwt } from '../middlewares/auth.js'
import {getPostLikes, likeDislikeComment, likeDislikePost, likeDislikeTweet } from '../controllers/like.controller.js'

const router = Router()

router.route('/posts/:postId').post(verifyJwt, likeDislikePost)
        .get(verifyJwt, getPostLikes)
router.route('/commets/:commentId').post(verifyJwt, likeDislikeComment)
router.route('/tweets/:tweetId').post(verifyJwt, likeDislikeTweet)



export default router