require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/certificates', express.static('certificates'));
const multer = require('multer');

// MongoDB Connection with error handling
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/educationDB';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected Successfully');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

// Call connectDB
connectDB();

// Create required directories if they don't exist
const requiredDirs = ['public', 'certificates', 'up', 'documents'];
requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Education Schema
const educationSchema = new mongoose.Schema({
  board: { type: String, required: true },
  schoolName: { type: String, required: true },
  percentage: { type: Number, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  fromYear: { type: Number, required: true },
  toYear: { type: Number, required: true },
  certificate: { type: String, required: true }
});

const Education = mongoose.model('Education', educationSchema);

// User Schema
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  panNo: { type: String, required: true },
  panDoc: { type: String, required: true },
  aadharNo: { type: String, required: true },
  aadharDoc: { type: String, required: true },
  permanentAddress: {
    street: String,
    city: String,
    state: String,
    pinCode: String
  },
  temporaryAddress: {
    street: String,
    city: String,
    state: String,
    pinCode: String
  },
  dob: { type: Date, required: true }
});

// Virtual for age calculation
userSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

const User = mongoose.model('User', userSchema);

// File Upload Configuration with error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.fieldname === 'up' ? 'up/' :
                file.fieldname === 'certificates' ? 'certificates/' :
                file.fieldname === 'documents' ? 'documents/' : null;
    
    if (!dest) {
      return cb(new Error('Invalid file destination'), false);
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.'), false);
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// Routes with error handling
app.post('/api/users', upload.fields([
  { name: 'panDoc', maxCount: 1 },
  { name: 'aadharDoc', maxCount: 1 }
]), async (req, res) => {
  try {
    const { files, body } = req;
    
    if (!files.panDoc || !files.aadharDoc) {
      return res.status(400).json({ error: 'Missing required documents' });
    }

    const userData = {
      ...body,
      panDoc: files.panDoc[0].path,
      aadharDoc: files.aadharDoc[0].path,
      dob: new Date(body.dob)
    };

    const user = new User(userData);
    await user.save();
    
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start server with error handling
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});