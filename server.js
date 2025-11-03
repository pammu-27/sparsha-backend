const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();
const prisma = new PrismaClient();
const app = express();

// ✅ CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://sparsha-fabrication.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// ✅ Static file CORS fix
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://sparsha-fabrication.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static(path.join(__dirname, 'uploads')));


// Multer config
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'uploads/'),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Routes
app.post('/upload', upload.single('media'), async (req, res) => {
  const { alt, tags } = req.body;
  const file = req.file;
  const url = `/uploads/${file.filename}`;

  const media = await prisma.media.create({
    data: {
      filename: file.originalname,
      url,
      alt,
      tags: tags ? tags.split(',') : []
    }
  });

  res.json(media);
});

app.get('/gallery', async (_, res) => {
  const media = await prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(media);
});

app.post('/testimonial', async (req, res) => {
  const { name, message } = req.body;
  const testimonial = await prisma.testimonial.create({ data: { name, message } });
  res.json(testimonial);
});

app.get('/testimonials', async (_, res) => {
  const testimonials = await prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(testimonials);
});

app.post('/contact', async (req, res) => {
  const { name, phone, message } = req.body;
  const inquiry = await prisma.inquiry.create({ data: { name, phone, message } });
  res.json(inquiry);
});

app.get('/contact', async (_, res) => {
  const inquiries = await prisma.inquiry.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(inquiries);
});

app.put('/media/:id', async (req, res) => {
  const { id } = req.params;
  const { alt, tags } = req.body;
  const updated = await prisma.media.update({
    where: { id: parseInt(id) },
    data: {
      alt,
      tags: tags ? tags.split(',') : []
    }
  });
  res.json(updated);
});

app.delete('/media/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.media.delete({ where: { id: parseInt(id) } });
  res.json({ success: true });
});

app.put('/testimonial/:id', async (req, res) => {
  const { id } = req.params;
  const { name, message } = req.body;
  const updated = await prisma.testimonial.update({
    where: { id: parseInt(id) },
    data: { name, message }
  });
  res.json(updated);
});

app.delete('/testimonial/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.testimonial.delete({ where: { id: parseInt(id) } });
  res.json({ success: true });
});

// ✅ Health Check Route
app.get('/', (req, res) => {
  res.send('✅ Backend is live and CORS-enabled');
});

app.listen(5000, () => console.log('✅ Backend running at live'));
