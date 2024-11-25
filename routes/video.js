const express = require('express')
const Router = express.Router()
const checkAuth = require('../middleware/checkAuth')
const jwt = require('jsonwebtoken')
const cloudinary = require('cloudinary').v2
const Video = require('../models/Video')
const mongoose = require('mongoose')


cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.API_KEY, 
    api_secret: process.env.API_SECRET // Click 'View API Keys' above to copy your API secret
});

// get own video
Router.get('/own-video',checkAuth,async (req,res)=>{
    try
    {
        const token = req.headers.authorization.split(" ")[1]
        const user = await jwt.verify(token, 'sbs online classes 123')
        console.log(user)
        const videos = await Video.find({user_id:user._id}).populate('user_id','channelName logoUrl subscribers')
        res.status(200).json({
            videos:videos
        })
    }
    catch(err)
    {
        console.log(err)
        res.status(500).json({
            error:err
        })
    }
})

// upload video

Router.post('/upload',checkAuth,async(req,res)=>{
    try
    {
        const token = req.headers.authorization.split(" ")[1]
        const user = await jwt.verify(token, 'sbs online classes 123')
        // console.log(user)
        // console.log(req.body)
        // console.log(req.files.video)
        // console.log(req.files.thumbnail)
        const uploadedVideo = await cloudinary.uploader.upload(req.files.video.tempFilePath,{
            resource_type:'video'
        })
        const uploadedThumbnail = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath)
        
        const newVideo = new Video({
            _id:new mongoose.Types.ObjectId,
            title:req.body.title,
            description:req.body.description,
            user_id:user._id,
            videoUrl:uploadedVideo.secure_url,
            videoId:uploadedVideo.public_id,
            thumbnailUrl:uploadedThumbnail.secure_url,
            thumbnailId:uploadedThumbnail.public_id,
            category:req.body.category,
            tags:req.body.tags.split(",")
        })

        const newUploadedVideoData = await newVideo.save()
        res.status(200).json({
            newVideo:newUploadedVideoData
        })

    }
    catch(err)
    {
        console.log(err)
        res.status(500).json({
            error:err
        })
    }
})

// update video detail
Router.put('/:videoId',checkAuth,async(req,res)=>{
    try
    {
        const verifiedUser = await jwt.verify(req.headers.authorization.split(" ")[1],'sbs online classes 123')
        const video =  await Video.findById(req.params.videoId)
        console.log(video)

        if(video.user_id == verifiedUser._id)
        {
            //update video detail
            if(req.files)
            {
                //update thumbnail and text data
                await cloudinary.uploader.destroy(video.thumbnailId)
                const updatedThumbnail = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath)
                const updatedData = {
                    title:req.body.title,
                    description:req.body.description,
                    category:req.body.category,
                    tags:req.body.tags.split(","),
                    thumbnailUrl:updatedThumbnail.secure_url,
                    thumbnailId:updatedThumbnail.public_id,
                }

                const updatedVideoDetail = await Video.findByIdAndUpdate(req.params.videoId,updatedData,{new:true})
                res.status(200).json({
                    updatedVideo:updatedVideoDetail
                })
            }
            else
            {
                const updatedData = {
                    title:req.body.title,
                    description:req.body.description,
                    category:req.body.category,
                    tags:req.body.tags.split(","),
                }

                const updatedVideoDetail = await Video.findByIdAndUpdate(req.params.videoId,updatedData,{new:true})
                res.status(200).json({
                    updatedVideo:updatedVideoDetail
                })
            }
        }
        else
        {
            return res.status(500).json({
                error:'you have no permision'
            })
        }
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json({
            error:err
        })
    }
})

// delete api 
Router.delete('/:videoId',checkAuth,async(req,res)=>{
    try
    {
        const verifiedUser = await jwt.verify(req.headers.authorization.split(" ")[1],'sbs online classes 123') 
        console.log(verifiedUser)
        const video = await Video.findById(req.params.videoId)
        if(video.user_id == verifiedUser._id)
        {
            //delete video, thumnail and data from database
            await cloudinary.uploader.destroy(video.videoId,{resource_type:'video'})
            await cloudinary.uploader.destroy(video.thumbnailId)
            const deletedResponse = await Video.findByIdAndDelete(req.params.videoId)
            res.status(200).json({
                deletedResponse:deletedResponse
            })
        }
        else
        {
            return res.status(500).json({
                error:'aapke aukad se bahar hai...'
            })
        }
    }
    catch(err) 
    {
        console.log(err);
        res.status(500).json({
            error:err
        })
    }
})

//like api 
Router.put('/like/:videoId',checkAuth,async(req,res)=>{
    try
    {
        const verifiedUser = await jwt.verify(req.headers.authorization.split(" ")[1],'sbs online classes 123') 
        console.log(verifiedUser)
        const video = await Video.findById(req.params.videoId)
        console.log(video)
        if(video.likedBy.includes(verifiedUser._id))
        {
            return res.status(500).json({
                error:'already liked'
            })
        }

        if(video.dislikedBy.includes(verifiedUser._id))
        {
            video.dislike -= 1;
            video.dislikedBy = video.dislikedBy.filter(userId=>userId.toString() != verifiedUser._id)
        }

        video.likes += 1;
        video.likedBy.push(verifiedUser._id)
        await video.save();

        res.status(200).json({
            msg:'liked'
        })
    }
    catch(err)
    {
        console.log(err)
        res.status(500).json({
            error:err
        })
    }
})


// dislike api

Router.put('/dislike/:videoId',checkAuth,async(req,res)=>{
    try
    {
        const verifiedUser = await jwt.verify(req.headers.authorization.split(" ")[1],'sbs online classes 123') 
        console.log(verifiedUser)
        const video = await Video.findById(req.params.videoId)
        console.log(video)
        if(video.dislikedBy.includes(verifiedUser._id))
        {
            return res.status(500).json({
                error:'already disliked'
            })
        }

        if(video.likedBy.includes(verifiedUser._id))
        {
                video.likes -= 1;
                video.likedBy = video.likedBy.filter(userId=>userId.toString() != verifiedUser._id)
        }

        video.dislike += 1;
        video.dislikedBy.push(verifiedUser._id)
        await video.save();
        
        res.status(200).json({
            msg:'disliked'
        })
    }
    catch(err)
    {
        console.log(err)
        res.status(500).json({
            error:err
        })
    }
})

// views api
Router.put('/views/:videoId',async(req,res)=>{
    try
    {
        const video = await Video.findById(req.params.videoId)
        console.log(video)
        video.views += 1;
        await video.save();
        res.status(200).json({
            msg:'ok'
        })
    }
    catch(err)
    {
        console.log(err)
        res.status(500).json({
            error:err
        })
    }
})
module.exports = Router