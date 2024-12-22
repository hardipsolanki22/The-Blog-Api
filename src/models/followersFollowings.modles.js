import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const followarsFollowingsSchema = new mongoose.Schema({
    followers: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    followings: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
    
},{timestamps: true})

followarsFollowingsSchema.plugin(mongooseAggregatePaginate)

export const Follows = mongoose.model("Follows",followarsFollowingsSchema)