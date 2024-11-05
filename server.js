const express = require('express');
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = 3000;
const ASSEMBLYAI_API_KEY = '80e2efb5299f45a3b45981da601bfb1e'; // Use environment variable

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

async function transcribeAudio(fileBuffer) {
    try {
        const uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload', fileBuffer, {
            headers: {
                'authorization': ASSEMBLYAI_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const audioUrl = uploadResponse.data.upload_url;

         // Request transcription with summarization
         const transcriptionResponse = await axios.post('https://api.assemblyai.com/v2/transcript', {
            audio_url: audioUrl,
            summarization: true,
            summary_model: 'informative',
            summary_type: "bullets" // other options: "gist", "headline", "paragraph"
        }, {
            headers: {
                'authorization': ASSEMBLYAI_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        return transcriptionResponse.data.id;
    } catch (error) {
        console.error('Error during transcription:', error);
        throw new Error('Failed to transcribe audio.');
    }
}



async function getTranscriptionResult(transcriptionId) {
    try {
        const response = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
            headers: {
                'authorization': ASSEMBLYAI_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const transcriptionData = response.data;

        if (transcriptionData.status === 'completed') {
            return {
                text: transcriptionData.text,
                summary: transcriptionData.summary // Fetch summary here
            };
        } else if (transcriptionData.status === 'failed') {
            throw new Error('Transcription failed: ' + transcriptionData.error);
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching transcription result:', error);
        throw new Error('Failed to fetch transcription result.');
    }
}

app.post('/transcribe', upload.single('file'), async (req, res) => {
    try {
        const transcriptionId = await transcribeAudio(req.file.buffer);
        console.log('Transcription ID:', transcriptionId); // Log the ID to confirm
        res.json({ transcriptionId });
    } catch (error) {
        console.error('Error during transcription:', error.message);
        res.status(500).json({ error: error.message });
    }
});


app.get('/transcription/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const transcriptionData = await getTranscriptionResult(id);
        res.json({ status: transcriptionData ? 'completed' : 'processing', text: transcriptionData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//Text-to-Speech

const summarizeText = async (text) => {
    const response = await axios.post('https://api.textsummary.com/summarize', { text });
    return response.data.summary;
};

const textToSpeech = async (text) => {
    const response = await axios.post('https://api.texttospeech.com/convert', { text }, {
        responseType: 'arraybuffer',
    });
    return response.data;
};

app.post('/summarize', async (req, res) => {
    try {
        const { text } = req.body;
        const summary = await summarizeText(text);
        res.json({ summary });
    } catch (error) {
        console.error('Summarization error:', error);
        res.status(500).json({ error: 'Summarization failed' });
    }
});

app.post('/text-to-speech', async (req, res) => {
    try {
        const { text } = req.body;
        const audioData = await textToSpeech(text);
        res.set('Content-Type', 'audio/mpeg');
        res.send(audioData);
    } catch (error) {
        console.error('Text-to-Speech error:', error);
        res.status(500).json({ error: 'Text-to-Speech conversion failed' });
    }
});


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
