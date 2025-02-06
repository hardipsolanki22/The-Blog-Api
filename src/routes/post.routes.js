import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.js";
import {
         deletePost,
         getUserAllPost,
         getPost,
         updatePost, 
         getFollowingUserPost,
         getAllPosts,
         createPost} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.js";

const router = Router()

//todo
router.route('/')
        .post(verifyJwt, upload.single('post'), createPost)
        .get(verifyJwt ,getAllPosts)
router.route('/follow/posts').get(verifyJwt , getFollowingUserPost)
router.route('/:postId')
            .get(verifyJwt , getPost)
            .patch(verifyJwt , updatePost)
            .delete(verifyJwt , deletePost)
router.route('/users/:userId').get(verifyJwt , getUserAllPost)

export default router

