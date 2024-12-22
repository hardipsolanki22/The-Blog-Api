import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
    origin: "  http://localhost:5173",
    credentials: true
}))

app.use(express.json({limit: '16kb'}))

app.use(express.urlencoded({extended: true , limit: '16kb'}))

app.use(express.static('public'))

app.use(cookieParser())

import  userRoute from './routes/user.routes.js'
import postRoute from './routes/post.routes.js'
import subscriptionRoute from './routes/subscription.routes.js'
import likesRoute from './routes/like.routes.js'
import commentRoute from './routes/comment.routes.js'


app.use('/api/v1/user' ,userRoute )
app.use('/api/v1/post' ,postRoute )
app.use('/api/v1/subcriptions' ,subscriptionRoute )
app.use('/api/v1/like' ,likesRoute)
app.use('/api/v1/comment', commentRoute)


export {app}