import express from 'express';
import axios from 'axios';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.render("index");
});

// Polling utility
const pollForDownloadUrl = async (progressId, apiKey, maxAttempts = 10, delay = 2000) => {
    const progressUrl = `https://youtube-mp4-mp3-downloader.p.rapidapi.com/api/v1/progress?id=${progressId}`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await axios.get(progressUrl, {
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'youtube-mp4-mp3-downloader.p.rapidapi.com'
            }
        });

        const result = response.data;
        console.log(result.progress);
        if (result?.downloadUrl) {
            return result;
        }

        await new Promise(resolve => setTimeout(resolve, delay)); // wait before next attempt
    }

    throw new Error("Download URL not ready in time");
};

app.post('/convert-mp3', async (req, res) => {
    try {
        const videoUrl = req.body.url;
        const videoIdMatch = videoUrl.match(/(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
        if (!videoIdMatch) return res.status(400).send('Invalid YouTube URL');

        const videoId = videoIdMatch[1];
        const rapidApiKey = process.env.RAPIDAPI_KEY;

        // Step 1: Trigger conversion and get progressId
        const downloadInitResponse = await axios.get(
            `https://youtube-mp4-mp3-downloader.p.rapidapi.com/api/v1/download`,
            {
                params: {
                    format: 'mp3',
                    id: videoId,
                    audioQuality: '128',
                    addInfo: 'false'
                },
                headers: {
                    'x-rapidapi-key': rapidApiKey,
                    'x-rapidapi-host': 'youtube-mp4-mp3-downloader.p.rapidapi.com'
                }
            }
        );

        const progressId = downloadInitResponse.data?.progressId;
        const title = downloadInitResponse.data?.title;
        console.log(title);
        
        if (!progressId) {
            return res.status(500).send('Failed to get progress ID');
        }

        // Step 2: Poll for the actual download URL
        const result = await pollForDownloadUrl(progressId, rapidApiKey);
        const { downloadUrl } = result;

        if (!downloadUrl) {
            return res.status(500).send('Failed to fetch audio download link');
        }

        // Step 3: Stream the audio file to the client
        const audioStream = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream'
        });

        const fileTitle = (title || 'audio')
            .trim()
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '_');

        res.setHeader('Content-Disposition', `attachment; filename="${fileTitle}.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');

        audioStream.data.pipe(res);

    } catch (error) {
        console.error('Error:', error?.response?.data || error.message);
        res.status(500).send('Something went wrong');
    }
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
