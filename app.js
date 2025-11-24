import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true })); // Necessary for parsing the hidden form
app.use(express.json());

const { apiKey, apiHost, apiUrl, progUrl } = process.env;

app.get('/', (req, res) => res.render("index"));

// --- STEP 1: START ---
app.post('/api/start', async (req, res) => {
    try {
        const videoIdMatch = req.body.url.match(/(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
        if (!videoIdMatch) return res.status(400).json({ error: 'Invalid URL' });

        const response = await axios.get(`${apiUrl}`, {
            params: { format: 'mp3', id: videoIdMatch[1], audioQuality: '128' },
            headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': apiHost }
        });

        if (response.data.progressId) {
            console.log({title: response.data.title, link: req.body.url });
            res.json({ success: true, pid: response.data.progressId, title: response.data.title });
        } else {
            res.status(500).json({ error: 'No ID returned' });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- STEP 2: CHECK STATUS (POLLING) ---
app.get('/api/status', async (req, res) => {
    try {
        const { data } = await axios.get(`${progUrl}?id=${req.query.id}`, {
            headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': apiHost }
        });
        // Just pass the API response straight to the client
        res.json(data); 
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- STEP 3: STREAM FILE (Using POST to hide URL) ---
app.post('/api/stream', async (req, res) => {
    // We use req.body so the URL is NOT visible in the browser address bar
    const { downloadUrl, title } = req.body;

    try {
        const stream = await axios({ method: 'GET', url: downloadUrl, responseType: 'stream' });
        
        const safeTitle = (title || 'audio').replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');
        
        stream.data.pipe(res);
    } catch (e) { 
        console.error(e);
        res.send("Error fetching file stream."); 
    }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));