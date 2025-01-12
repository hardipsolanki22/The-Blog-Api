import express,{Router} from 'express'
import { verifyJwt } from '../middlewares/auth.js'
import { createTweet, deleteTweet, getTweets } from '../controllers/tweet.controller.js'

const router = Router()

router.route('/create-tweet').post(verifyJwt, createTweet)
router.route('/get-tweets').get(verifyJwt, getTweets)
router.route('/delete-tweets/:tweetId').delete(verifyJwt, deleteTweet)

export default router