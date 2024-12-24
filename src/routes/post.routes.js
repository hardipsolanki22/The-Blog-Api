import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.js";
import {
         deletePost,
         getUserAllPost,
         getPost,
         updatePost, 
         getFollowingsUserPost,
         getAllPosts,
         createPost} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.js";

const router = Router()

router.route('/add-post').post(verifyJwt, upload.single('post'), createPost)
router.route('/update-post/:postId').put(verifyJwt , updatePost)
router.route('/get-post/:postId').get(verifyJwt , getPost)
router.route('/get-user-all-posts/:userId').get(verifyJwt , getUserAllPost)
router.route('/get-followings-user-posts').get(verifyJwt , getFollowingsUserPost)
router.route('/get-all-posts').get(verifyJwt ,getAllPosts)
router.route('/delete-post/:postId').delete(verifyJwt , deletePost)

export default router

