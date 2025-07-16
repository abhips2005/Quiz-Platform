import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/supabaseAuth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow images, audio, and video files
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'video/mp4',
      'video/webm',
      'video/ogg'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, audio, and video files are allowed.') as any, false);
    }
  }
});

// Upload single file
router.post('/single', upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    throw createError('No file uploaded', 400);
  }

  // Determine media type
  let mediaType: 'IMAGE' | 'AUDIO' | 'VIDEO';
  if (req.file.mimetype.startsWith('image/')) {
    mediaType = 'IMAGE';
  } else if (req.file.mimetype.startsWith('audio/')) {
    mediaType = 'AUDIO';
  } else if (req.file.mimetype.startsWith('video/')) {
    mediaType = 'VIDEO';
  } else {
    throw createError('Unsupported file type', 400);
  }

  // Save file info to database
  const mediaFile = await prisma.mediaFile.create({
    data: {
      type: mediaType,
      url: `/uploads/${req.file.filename}`,
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user!.id
    }
  });

  res.json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      file: {
        id: mediaFile.id,
        url: mediaFile.url,
        filename: mediaFile.filename,
        size: mediaFile.size,
        mimeType: mediaFile.mimeType,
        type: mediaFile.type
      }
    },
    timestamp: new Date()
  });
}));

// Upload multiple files
router.post('/multiple', upload.array('files', 10), asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    throw createError('No files uploaded', 400);
  }

  const uploadedFiles = await Promise.all(
    files.map(async (file) => {
      let mediaType: 'IMAGE' | 'AUDIO' | 'VIDEO';
      if (file.mimetype.startsWith('image/')) {
        mediaType = 'IMAGE';
      } else if (file.mimetype.startsWith('audio/')) {
        mediaType = 'AUDIO';
      } else if (file.mimetype.startsWith('video/')) {
        mediaType = 'VIDEO';
      } else {
        throw createError('Unsupported file type', 400);
      }

      const mediaFile = await prisma.mediaFile.create({
        data: {
          type: mediaType,
          url: `/uploads/${file.filename}`,
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          uploadedBy: req.user!.id
        }
      });

      return {
        id: mediaFile.id,
        url: mediaFile.url,
        filename: mediaFile.filename,
        size: mediaFile.size,
        mimeType: mediaFile.mimeType,
        type: mediaFile.type
      };
    })
  );

  res.json({
    success: true,
    message: `${uploadedFiles.length} files uploaded successfully`,
    data: { files: uploadedFiles },
    timestamp: new Date()
  });
}));

// Get user's uploaded files
router.get('/my-files', asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = await prisma.mediaFile.findMany({
    where: { uploadedBy: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  res.json({
    success: true,
    data: { files },
    timestamp: new Date()
  });
}));

// Delete file
router.delete('/:fileId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const fileId = req.params.fileId;

  const file = await prisma.mediaFile.findUnique({
    where: { id: fileId }
  });

  if (!file) {
    throw createError('File not found', 404);
  }

  if (file.uploadedBy !== req.user!.id) {
    throw createError('You can only delete your own files', 403);
  }

  // TODO: Delete actual file from filesystem
  // fs.unlinkSync(path.join('uploads', path.basename(file.url)));

  await prisma.mediaFile.delete({
    where: { id: fileId }
  });

  res.json({
    success: true,
    message: 'File deleted successfully',
    timestamp: new Date()
  });
}));

export default router; 