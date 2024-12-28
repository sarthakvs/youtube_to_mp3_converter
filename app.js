const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));

//parse html data for POST requests
app.use(express.urlencoded({ extended:true}));
app.use(express.json());

app.get('/', (req, res) => {
    res.render("index");
});
app.post('/convert-mp3', async (req, res) => {
    const url = req.body.videoID;
    let uniqueID;
    if (url.includes('youtu.be')) {
    uniqueID = (url.match(/youtu\.be\/([^?&]+)/) || [, null])[1];
    } else {
        uniqueID = (url.match(/[?&]v=([^&]*)/) || [, null])[1];
    }
    if(uniqueID==undefined || uniqueID==null || uniqueID== "") return res.render("index",{success:false,message: "Please enter a valid youtube url"});
    else{
        const fetchAPI = await fetch(`https://youtube-mp3-download1.p.rapidapi.com/dl?id=${uniqueID}`,{
            "method" : "GET",
            "headers": {
                "x-rapidapi-key" : process.env.API_KEY,
                "x-rapidapi-host" : process.env.API_HOST
            }
        });
        const response = await fetchAPI.json();
        console.log(response);
        if(response.status == "ok") return res.render("index",{success:true,song_title: response.title,song_link:response.link});
        else{
            return res.render("index",{success:false,message:response.msg})
        }
    } 
});

app.listen(PORT,()=>{
    console.log(`Listening on port ${PORT}`);
});
