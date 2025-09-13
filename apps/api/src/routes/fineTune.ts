import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { processFineTuneVideo } from '../controllers/fineTune'

export const fineTuneRouter = Router()

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log('Created uploads directory:', uploadsDir)
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const extension = path.extname(file.originalname)
    const baseName = path.basename(file.originalname, extension)
    const newFilename = `fine-tune-${baseName}-${uniqueSuffix}${extension}`
    console.log('Generated fine-tune filename:', newFilename)
    cb(null, newFilename)
  }
})

// File filter to only allow video files
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log('File filter - checking file:', file.originalname, file.mimetype)
  
  const allowedTypes = /^video\//
  if (allowedTypes.test(file.mimetype)) {
    console.log('File type accepted:', file.mimetype)
    cb(null, true)
  } else {
    console.log('File type rejected:', file.mimetype)
    cb(null, false)
  }
}

// Configure multer with limits and file filter
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit for fine-tuning videos
    files: 1 // Only allow 1 file at a time
  }
})

// Error handling middleware for multer
const handleMulterError = (error: any, req: any, res: any, next: any) => {
  console.log('Multer error handler triggered:', error)
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 1GB for fine-tuning videos'
      })
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Only one file can be uploaded at a time'
      })
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field. Use "video" as the field name.'
      })
    }
  }
  
  if (error) {
    console.error('Multer error:', error)
    return res.status(500).json({
      success: false,
      error: 'File upload error: ' + error.message
    })
  }
  
  next()
}

// Routes
fineTuneRouter.post('/fine-tune/upload-video', upload.single('video'), handleMulterError, processFineTuneVideo)

// Test endpoint
fineTuneRouter.get('/fine-tune/test', (req, res) => {
  res.json({
    success: true,
    message: 'Fine-tune routes are working!',
    uploadsDir,
    timestamp: new Date().toISOString()
  })
})