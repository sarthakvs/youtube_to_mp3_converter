import express from 'express';
import ytDlp from 'yt-dlp-exec'; 
import path from 'path';
import fs from 'fs';
import os from 'os';
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.render("index");
});

app.post('/convert-mp3', async (req, res) => {
    try {
        const videoUrl = req.body.url;
        const videoIdMatch = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
        if (!videoIdMatch) return res.status(400).send('Invalid YouTube URL');

        const secretCookiePath = '/etc/secrets/cookies.txt';
        const tempCookiePath = path.join(os.tmpdir(), 'cookies.txt');
        fs.copyFileSync(secretCookiePath, tempCookiePath);

        // Get video title
        let videoTitle = await ytDlp(videoUrl, {
            print: '%(title)s',
            cookies: tempCookiePath
        });

        videoTitle = videoTitle.trim().replace(/[^\w\s]/gi, '').replace(/\s+/g, '_') || 'audio';
        console.log(videoTitle);
        res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');

        // Stream audio directly using yt-dlp-exec
        const audioStream = ytDlp.exec(videoUrl, {
            cookies: tempCookiePath,
            format: 'bestaudio',
            output: '-', // stream to stdout
            quiet: true
        });

        audioStream.stdout.pipe(res);

        audioStream.stderr.on('data', (data) => {
            console.error(`yt-dlp stderr: ${data}`);
        });

        audioStream.on('close', (code) => {
            if (code !== 0) {
                console.error(`yt-dlp process exited with code ${code}`);
                res.status(500).send('Failed to download audio');
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Something went wrong');
    }
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
