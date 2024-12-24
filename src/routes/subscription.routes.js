import {Router} from 'express'
import { getUserFollowers,
        followUnfollowUser,
        getUserFollowigns,
} from '../controllers/subscription.controller.js'
import { verifyJwt } from '../middlewares/auth.js'

const router = Router()

router.route('/:userId/following').post(verifyJwt, followUnfollowUser)
router.route('/get-user-followers/:userId').get(verifyJwt ,getUserFollowers )
router.route('/get-user-followings/:userId').get(verifyJwt ,getUserFollowigns)


export default router

