import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// List of your API keys
const RAPIDAPI_KEYS = [process.env.RAPIDAPI_KEY1, process.env.RAPIDAPI_KEY2];
const fetchWithFallback = async (videoID, attempt = 0) => {
    const keyIndex = attempt % RAPIDAPI_KEYS.length;
    const apiKey = RAPIDAPI_KEYS[keyIndex];

    try {
        const fetchAPI = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoID}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com'
            }
        });

        const response = await fetchAPI.json();
        console.log(response);

        if (response.status === 'ok') {
            return { success: true, title: response.title, link: response.link };
        } else if (response.status === 'processing') {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchWithFallback(videoID, attempt);
        } else if (response.status === 'fail') {
            if (attempt + 1 < RAPIDAPI_KEYS.length) {
                return fetchWithFallback(videoID, attempt + 1);
            } else {
                return { success: false, message: response.msg || "All API keys failed." };
            }
        } else {
            return { success: false, message: "Unknown status from API" };
        }
    } catch (err) {
        if (attempt + 1 < RAPIDAPI_KEYS.length) {
            return fetchWithFallback(videoID, attempt + 1);
        }
        return { success: false, message: "Network error, all keys failed" };
    }
};

app.post('/convert-mp3', async (req, res) => {
    const videoUrl = req.body.url;
    const videoIdMatch = videoUrl.match(/(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
    if (!videoIdMatch) return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });

    const videoID = videoIdMatch[1];
    const result = await fetchWithFallback(videoID);

    if (result.success) {
        return res.json({ success: true, title: result.title, link: result.link });
    } else {
        return res.json({ success: false, message: result.message });
    }
});
app.get('/', (req, res) => {
    res.render("index");
});
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
