import express,{Router} from 'express'
import { verifyJwt } from '../middlewares/auth.js'
import {getCommentLikeDislikeCount, getPostLikes, likeDislikeComment, likeDislikePost } from '../controllers/like.controller.js'

const router = Router()

router.route('/create-like/:postId').post(verifyJwt, likeDislikePost)
router.route('/create-comment-likes/:commentId').post(verifyJwt, likeDislikeComment)
router.route('/get-likes/:postId').get(verifyJwt, getPostLikes)
router.route('/get-likes-dislike/:commentId').get(getCommentLikeDislikeCount)


export default router