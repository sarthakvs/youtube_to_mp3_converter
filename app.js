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
const RAPIDAPI_KEYS = [process.env.RAPIDAPI_KEY1, process.env.RAPIDAPI_KEY2,process.env.RAPIDAPI_KEY3,process.env.RAPIDAPI_KEY4];

const fetchWithFallback = async (videoID, attempt = 0, retries = 5, keyIndex = 0) => {
    if (retries <= 0) {
        return { success: false, message: "Max retries reached, try again later." };
    }

    const apiKey = RAPIDAPI_KEYS[keyIndex];
    console.log(`🔑 Attempt ${attempt} | Using key[${keyIndex}] (${apiKey.slice(0,3)}...)`);

    try {
        const fetchAPI = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoID}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com'
            }
        });

        const response = await fetchAPI.json();
        console.log(`📡 Response from key[${keyIndex}]:`, response);

        if (response.status === 'ok') {
            return { success: true, title: response.title, link: response.link };
        }

        if (response.status === 'processing') {
            // stay on same key
            console.log(`⏳ Still processing... retrying with same key[${keyIndex}]`);
            await new Promise(r => setTimeout(r, 2000));
            return fetchWithFallback(videoID, attempt + 1, retries - 1, keyIndex);
        }

        // if status is anything else (fail, error, quota, etc.) → switch key
        const nextKeyIndex = (keyIndex + 1) % RAPIDAPI_KEYS.length;
        console.log(`⚠️ Unexpected status "${response.status}". Switching to key[${nextKeyIndex}]`);
        return fetchWithFallback(videoID, attempt + 1, retries - 1, nextKeyIndex);

    } catch (err) {
        console.error(`❌ Error with key[${keyIndex}]:`, err.message);
        const nextKeyIndex = (keyIndex + 1) % RAPIDAPI_KEYS.length;
        return fetchWithFallback(videoID, attempt + 1, retries - 1, nextKeyIndex);
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
