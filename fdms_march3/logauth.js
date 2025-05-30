const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();
const { GridFSBucket } = require('mongodb');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');

// Add this after your mongoose connection
let gfs;
mongoose.connection.once('open', () => {
    gfs = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads'
    });
});

const app = express();
app.use(cors({
    origin: [
        'https://tathya-theta.vercel.app',
        'https://fdms-kmit.vercel.app', // Your Vercel URL
        'http://localhost:4009'        // Local development
    ],
    credentials: true
}));
app.use(express.json());

const http = require('http');
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: "http://localhost:4009",
      methods: ["GET", "POST"]
    }
});

const { OpenAI } = require('openai');

// Configure OpenAI using environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 15000
});

// Inside the connection handler
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('chat message', async (msg) => {
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "system",
                    content: "You are a helpful assistant for a Faculty Dashboard Management System. Keep responses professional and focused on academic matters."
                }, {
                    role: "user",
                    content: msg
                }],
                temperature: 0.7,
                max_tokens: 150
            });

            const response = completion.choices[0].message.content;
            socket.emit('bot response', response);
        } catch (error) {
            console.error('AI Error:', error);
            socket.emit('bot response', 'Sorry, I encountered an error. Please try again later.');
        }
    });
});

// Add specific routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login_auth.html'));
});

app.get('/faculty_dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'faculty_dashboard.html'));
});

app.get('/aibot', (req, res) => {
    res.sendFile(path.join(__dirname, 'aibot.html'));
});

app.get('/admin_dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin_dashboard.html'));
});

app.get('/form', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

app.get('/manage_users', (req, res) => {
    res.sendFile(path.join(__dirname, 'manage_users.html'));
});

app.get('/my_profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'my_profile.html'));
});

app.get('dash_styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'dash_styles.css'));
});

app.get('form.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/login_auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login_auth.html'));
});

app.get('/faculty_profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'faculty_profile.html'));
});

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// MongoDB Connection using environment variable
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000
}).then(() => {
    console.log('Connected to MongoDB Atlas');
}).catch(err => {
    console.error('Error connecting to MongoDB Atlas:', err);
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['Faculty', 'HOD', 'Admin'] },
    department: { type: String, required: true, enum: ['CSE', 'DS', 'AIML', 'IT'] },
    phoneNumber: { type: String },
    googleId: { type: String },
    profilePhoto: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    loginHistory: [{
        timestamp: { type: Date, default: Date.now },
        device: String,
        browser: String
    }],
    loginCount: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// Google OAuth client using environment variables
const googleClient = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: 'https://fdms-kmit.vercel.app/auth/google/callback'
});

// ... rest of your existing code ...
