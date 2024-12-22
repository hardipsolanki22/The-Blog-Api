import mongoose,{Schema} from "mongoose";
import bcrypt from 'bcryptjs'
import jwt from "jsonwebtoken"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        require: [true , "Password is rqquired"]
    },
    avatar: {
        type: String,
        require: true,
    },
    refreshToken: {
        type: String,
    },
    token: {
        type: String,
        default: ""
    },

} , {timestamps: true})

userSchema.plugin(mongooseAggregatePaginate)

userSchema.pre("save" , async function(next) {
   if(!this.isModified('password'))  return next()

    this.password = await bcrypt.hash(this.password , 10)
    next()
})

userSchema.methods.isPasswordCurrect = async function(password) {
      return await bcrypt.compare(password , this.password)
   
}

userSchema.methods.generateAceessToken = function() {
  return  jwt.sign({
        _id: this.id
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
)}

userSchema.methods.generateRefreshToken = function() {
  return  jwt.sign({
        _id: this.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.RESFRESH_TOKEN_EXPIRY
    }

)}

userSchema.methods.generateRandomeStrings = function() {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.RANDOME_STRING_GENERATE,
        {
            expiresIn: process.env.RANDOME_STRING_EXPIRY
        }
    )
}


export const User = mongoose.model("User", userSchema)

