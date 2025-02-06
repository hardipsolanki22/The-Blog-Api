import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.js";
import { createComment, deleteComment, getPostComment, updateComment } from "../controllers/comment.controller.js";

const router = Router()

router.route('/posts/:postId').post(verifyJwt, createComment)
            .get(verifyJwt, getPostComment)
router.route('/:commentId').patch(verifyJwt, updateComment)
            .delete(verifyJwt, deleteComment)

export default router