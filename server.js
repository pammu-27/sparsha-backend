const express = require('express');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();
const prisma = new PrismaClient();
const app = express();

// ✅ Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

// ✅ Multer Memory Storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Upload to Supabase Storage
app.post('/upload', upload.single('media'), async (req, res) => {
  const { alt, tags } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = `gallery/${Date.now()}-${file.originalname}`;

  const { data, error } = await supabase.storage
    .from('gallery')
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false
    });

  if (error) return res.status(500).json({ error: error.message });

  const publicUrl = supabase.storage.from('gallery').getPublicUrl(filePath).data.publicUrl;

  const media = await prisma.media.create({
    data: {
      filename: file.originalname,
      url: publicUrl,
      alt,
      tags: tags ? tags.split(',') : []
    }
  });

  res.json(media);
});

// ✅ Gallery
app.get('/gallery', async (_, res) => {
  const media = await prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(media);
});

// ✅ Testimonials
app.post('/testimonial', async (req, res) => {
  const { name, message } = req.body;
  const testimonial = await prisma.testimonial.create({ data: { name, message } });
  res.json(testimonial);
});

app.get('/testimonials', async (_, res) => {
  const testimonials = await prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(testimonials);
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

// ✅ Contact
app.post('/contact', async (req, res) => {
  const { name, phone, message } = req.body;
  const inquiry = await prisma.inquiry.create({ data: { name, phone, message } });
  res.json(inquiry);
});

app.get('/contact', async (_, res) => {
  const inquiries = await prisma.inquiry.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(inquiries);
});

// ✅ Media Update/Delete
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

// ✅ Health Check
app.get('/', (req, res) => {
  res.send('✅ Backend is live with Supabase Storage');
});

app.listen(5000, () => console.log('✅ Backend running at live'));
