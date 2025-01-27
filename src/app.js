import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
    origin: [process.env.REQUEST_URL, "http://localhost:5173"],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }))

app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 50000 }))

app.use(express.static('public'))

app.use(cookieParser())

import healthcheckRoute from './routes/healthcheck.routes.js'
import userRoute from './routes/user.routes.js'
import postRoute from './routes/post.routes.js'
import followsRoute from './routes/follows.routes.js'
import likesRoute from './routes/like.routes.js'
import commentRoute from './routes/comment.routes.js'
import tweetRoute from './routes/tweet.routes.js'

app.use('/api/v1/healthcheck', healthcheckRoute)
app.use('/api/v1/user', userRoute)
app.use('/api/v1/post', postRoute)
app.use('/api/v1/follows', followsRoute)
app.use('/api/v1/like', likesRoute)
app.use('/api/v1/comment', commentRoute)
app.use('/api/v1/tweet', tweetRoute)


export { app }