import {Router} from 'express'
import { getUserFollowers,
        followUnfollowUser,
        getUserFollowing,
} from '../controllers/follows.controller.js'
import { verifyJwt } from '../middlewares/auth.js'

const router = Router()

router.route('/:userId').post(verifyJwt, followUnfollowUser)
router.route('/list/followers/:userId').get(verifyJwt ,getUserFollowers )
router.route('/list/following/:userId').get(verifyJwt ,getUserFollowing)


export default router

