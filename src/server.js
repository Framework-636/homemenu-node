import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

//Middleware: parse JSON request bodies
app.use(express.json());

// Route: health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start listening for requests 
app.listen(PORT, () => {
    console.log(`HomeMenu API running at http://localhost:${PORT}`);
});