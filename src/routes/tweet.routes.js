import express,{Router} from 'express'
import { verifyJwt } from '../middlewares/auth.js'
import { createTweet, deleteTweet, getTweets } from '../controllers/tweet.controller.js'

const router = Router()

router.route('/').get(verifyJwt, getTweets)
                .post(verifyJwt, createTweet)
router.route('/:tweetId').delete(verifyJwt, deleteTweet)

export default router