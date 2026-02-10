import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { AppError } from './errorHandler.js';

// ============================================
// Storage Configuration
// ============================================

// Create unique filename with timestamp
const generateFileName = (file: Express.Multer.File): string => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(file.originalname);
  return `${file.fieldname}-${uniqueSuffix}${ext}`;
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Videos go to uploads/raw, thumbnails to uploads/thumbnails
    const dest = file.fieldname === 'thumbnail' 
      ? './uploads/thumbnails' 
      : './uploads/raw';
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, generateFileName(file));
  },
});

// ============================================
// File Validation
// ============================================

// Allowed video formats
const videoMimeTypes = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',  // .mov
  'video/x-msvideo',  // .avi
  'video/x-matroska', // .mkv
  'video/webm',
];

// Allowed image formats for thumbnails
const imageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check video file
  if (file.fieldname === 'video') {
    if (videoMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid video format. Allowed: MP4, MOV, AVI, MKV, WebM', 400));
    }
  }
  
  // Check thumbnail file
  else if (file.fieldname === 'thumbnail') {
    if (imageMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid image format. Allowed: JPEG, PNG, WebP', 400));
    }
  }
  
  else {
    cb(new AppError('Unexpected field', 400));
  }
};

// ============================================
// Multer Configuration
// ============================================

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max for videos
    files: 2, // video + thumbnail
  },
});

// ============================================
// Upload Middleware
// ============================================

/**
 * Single video upload
 */
export const uploadVideo = upload.single('video');

/**
 * Video + thumbnail upload
 */
export const uploadVideoWithThumbnail = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

// ============================================
// Error Handling for Multer
// ============================================

export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    // Multer-specific errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: {
          message: 'File too large. Maximum size is 5GB.',
        },
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Too many files. Maximum is 2 files (video + thumbnail).',
        },
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Unexpected file field.',
        },
      });
    }
  }
  
  // Pass to global error handler
  next(error);
};
