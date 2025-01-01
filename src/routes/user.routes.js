import { Router } from "express";
import {
    changePassword,
    getCurrentUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateUserDetails,
    searchUser,
    forgetPassword,
    resetPassword,
    getUserProfile,
    updateUserAvatar,
    updateUserCoverImage,
    getAllUsers,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import { verifyJwt } from "../middlewares/auth.js";

const router = Router()

router.route('/register').post(
        upload.fields([
            {
                name: "avatar",
                maxCount: 1
            },
            {
                name: "coverImage",
                maxCount: 1,
            }
        ]),
        registerUser
    )

router.route('/login').post(loginUser)
router.route('/logout').post(verifyJwt, logoutUser)
router.route('/access-refresh-token').post(refreshAccessToken)
router.route('/get-user').get(verifyJwt, getCurrentUser)
router.route('/change-password').patch(verifyJwt, changePassword)
router.route('/update-account-details').patch(verifyJwt, updateUserDetails)
router.route('/update-avatar').patch(
    verifyJwt,
    upload.single("avatar"),
    updateUserAvatar
)
router.route('/update-cover-image').patch(
    verifyJwt,
    upload.single('coverImage'),
    updateUserCoverImage
)
router.route('/search-user').get(verifyJwt, searchUser)
router.route('/forger-password').post(forgetPassword)
router.route('/reset-password').patch(resetPassword)
router.route('/profile/:username').get(verifyJwt, getUserProfile)
router.route('/get-all-users').get(verifyJwt, getAllUsers)
export default router