import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const postShema = new Schema(
    {
        title: {
            type: String,
            required: true,
            min: [15 , 'maximum 15 charecter']
        },
        description: {
            type: String,
            reuqired: true
        },
        owner: {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        image: {
            type: String,
            required: true
        },
        status: {
            type:String,
            // enum: ['active' , 'inactive'],
            required: true,
            default: 'active'
        }
    } ,{timestamps: true})

    postShema.plugin(mongooseAggregatePaginate)

    export const Post = mongoose.model("Post" , postShema)