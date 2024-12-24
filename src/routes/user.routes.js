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
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import { verifyJwt } from "../middlewares/auth.js";

const router = Router()

router.route('/register').post(upload.single('avatar'), registerUser)
router.route('/login').post(loginUser)
router.route('/logout').post(verifyJwt, logoutUser)
router.route('/access-refresh-token').post(refreshAccessToken)
router.route('/get-user').get(verifyJwt, getCurrentUser)
router.route('/change-password').patch(verifyJwt, changePassword)
router.route('/update-account-details').put(verifyJwt,upload.single('avatar'), updateUserDetails)
router.route('/search-user').get(searchUser)
router.route('/forger-password').post(forgetPassword)
router.route('/reset-password').patch(resetPassword)
router.route('/profile/:username').get(verifyJwt, getUserProfile)
export default router