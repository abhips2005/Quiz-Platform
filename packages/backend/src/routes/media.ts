import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { supabaseAuthMiddleware } from '../middleware/supabaseAuth';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const typeDir = path.join(uploadsDir, file.mimetype.split('/')[0]);
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for security
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
    video: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime']
  };

  const type = file.mimetype.split('/')[0] as keyof typeof allowedMimes;
  
  if (allowedMimes[type] && allowedMimes[type].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, audio, and video files are allowed.'));
  }
};

// Configure upload limits
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 1 // Single file upload
  }
});

// Upload endpoint
router.post('/upload', supabaseAuthMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const userId = req.user!.id;

    // Determine media type
    const mediaTypeMap: { [key: string]: 'IMAGE' | 'AUDIO' | 'VIDEO' } = {
      'image': 'IMAGE',
      'audio': 'AUDIO',
      'video': 'VIDEO'
    };

    const mediaType = mediaTypeMap[file.mimetype.split('/')[0]];
    
    if (!mediaType) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Unsupported media type' });
    }

    // Create media file record
    const mediaFile = await prisma.mediaFile.create({
      data: {
        type: mediaType,
        url: `/api/media/serve/${path.basename(file.path)}`,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedBy: userId,
        // TODO: Extract width/height for images, duration for audio/video
      }
    });

    res.status(201).json({
      id: mediaFile.id,
      type: mediaFile.type,
      url: mediaFile.url,
      filename: mediaFile.filename,
      size: mediaFile.size,
      mimeType: mediaFile.mimeType
    });

  } catch (error) {
    console.error('Media upload error:', error);
    
    // Clean up file if it exists
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }

    res.status(500).json({ error: 'Failed to upload media file' });
  }
});

// Serve media files
router.get('/serve/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security check: prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Find file in uploads subdirectories
    const searchDirs = ['image', 'audio', 'video'];
    let filePath: string | null = null;

    for (const dir of searchDirs) {
      const testPath = path.join(uploadsDir, dir, filename);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Media serve error:', error);
    res.status(500).json({ error: 'Failed to serve media file' });
  }
});

// Get media file metadata
router.get('/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const mediaId = req.params.id;

    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        type: true,
        url: true,
        filename: true,
        size: true,
        mimeType: true,
        duration: true,
        width: true,
        height: true,
        createdAt: true
      }
    });

    if (!mediaFile) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    res.json(mediaFile);

  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ error: 'Failed to get media file' });
  }
});

// Delete media file
router.delete('/:id', supabaseAuthMiddleware, async (req, res) => {
  try {
    const mediaId = req.params.id;
    const userId = req.user!.id;

    // Check if user owns the media file or is admin
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: mediaId }
    });

    if (!mediaFile) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    // Check permissions (owner or admin)
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (mediaFile.uploadedBy !== userId && user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to delete this media file' });
    }

    // Delete file from filesystem
    const filename = path.basename(mediaFile.url);
    const searchDirs = ['image', 'audio', 'video'];
    
    for (const dir of searchDirs) {
      const filePath = path.join(uploadsDir, dir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        break;
      }
    }

    // Delete database record
    await prisma.mediaFile.delete({
      where: { id: mediaId }
    });

    res.json({ message: 'Media file deleted successfully' });

  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ error: 'Failed to delete media file' });
  }
});

// List user's media files
router.get('/', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;

    const where: any = { uploadedBy: userId };
    if (type && ['IMAGE', 'AUDIO', 'VIDEO'].includes(type)) {
      where.type = type;
    }

    const [mediaFiles, total] = await Promise.all([
      prisma.mediaFile.findMany({
        where,
        select: {
          id: true,
          type: true,
          url: true,
          filename: true,
          size: true,
          mimeType: true,
          duration: true,
          width: true,
          height: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.mediaFile.count({ where })
    ]);

    res.json({
      data: mediaFiles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('List media error:', error);
    res.status(500).json({ error: 'Failed to list media files' });
  }
});

export default router; 
