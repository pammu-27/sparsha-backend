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
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked: ${origin}`);
      callback(null, false); // Don't throw — just block
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));


app.use(express.json());

// ✅ Multer Memory Storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Upload to Supabase Storage
app.post('/upload', upload.single('media'), async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ✅ Gallery
app.get('/gallery', async (_, res) => {
  try {
    const media = await prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

// ✅ Testimonials
app.post('/testimonial', async (req, res) => {
  try {
    const { name, message } = req.body;
    const testimonial = await prisma.testimonial.create({ data: { name, message } });
    res.json(testimonial);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create testimonial' });
  }
});

app.get('/testimonials', async (_, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

app.put('/testimonial/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, message } = req.body;
    const updated = await prisma.testimonial.update({
      where: { id: parseInt(id) },
      data: { name, message }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});

app.delete('/testimonial/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.testimonial.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

// ✅ Contact
app.post('/contact', async (req, res) => {
  try {
    const { name, phone, message } = req.body;
    const inquiry = await prisma.inquiry.create({ data: { name, phone, message } });
    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

app.get('/contact', async (_, res) => {
  try {
    const inquiries = await prisma.inquiry.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

// ✅ Media Update/Delete
app.put('/media/:id', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to update media' });
  }
});

app.delete('/media/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.media.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

app.use((err, req, res, next) => {
  console.error('🔥 Uncaught error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ✅ Health Check
app.get('/', (req, res) => {
  res.send('✅ Backend is live with Supabase Storage');
});

app.listen(5000, () => console.log('✅ Backend running at http://localhost:5000'));
