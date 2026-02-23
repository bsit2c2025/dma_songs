const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Data file
const dataFile = path.join(__dirname, 'data.json');

// Initialize data if not exists
if (!fs.existsSync(dataFile)) {
    const initialData = {
        announcement: {
            date: "December 20, 2025",
            event: "SM World Chorale Day",
            time: "10 AM | 1 PM - 4 PM for the Main Event",
            where: "School for preparation and SM for the main venue",
            dress: "",
            song: "O-nata lux & Pasko sa bayan"
        }
    };
    fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2));
}

// Routes
app.get('/api/announcement', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        res.json(data.announcement);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load announcement' });
    }
});

app.post('/api/announcement', (req, res) => {
    // Simple auth - in production, use proper auth
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer admin123') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        data.announcement = req.body;
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save announcement' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});