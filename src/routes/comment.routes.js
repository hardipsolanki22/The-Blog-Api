import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.js";
import { createComment, deleteComment, getPostComment, updateComment } from "../controllers/comment.controller.js";

const router = Router()

router.route('/create-comment').post(verifyJwt, createComment)
router.route('/get-post-comment/:postId').get(verifyJwt, getPostComment)
router.route('/update-comments/:id').patch(verifyJwt, updateComment)
router.route('/delete-comments/:id').delete(verifyJwt, deleteComment)

export default router