const express = require('express');
const fetch = require('node-fetch');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

const app = express();
ffmpeg.setFfmpegPath(ffmpegPath);
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));

app.use(express.urlencoded({ extended:true}));
app.use(express.json());

app.get('/', (req, res) => {
    res.render("index");
});
app.post('/convert-mp3', async (req, res) => {
    try{
        const videoUrl = req.body.url;
        if(!ytdl.validateURL(videoUrl)) {
            return res.status(400).send('Wrong Youtube URL');
        }
        const info = await ytdl.getInfo(videoUrl);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi,'');
        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type','audio/mpeg');

        const audioStream = ytdl(videoUrl,{quality:'highestaudio'});
        const ffmpegCommand = ffmpeg(audioStream).audioBitrate(128).format('mp3')
        ffmpegCommand.pipe(res,{end:true});
        req.on('close', () => {
            console.log('Client aborted download. Stopping FFmpeg...');
            ffmpegCommand.kill('SIGKILL'); 
        });
        ffmpegCommand.on('error', (err) => {
            console.error('FFmpeg error:', err);
            if (!res.headersSent) {
                res.status(500).send('Conversion Failed');
            }
        });
    } catch(error){
        console.error('Error:',error);
        res.status(500).send('Failed to process request');
    }
});

app.listen(PORT,()=>{
    console.log(`Listening on port ${PORT}`);
});
