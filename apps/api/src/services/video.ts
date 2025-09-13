import fs from 'fs'
import path from 'path'

export interface VideoMetadata {
  filename: string
  originalName: string
  size: number
  mimeType: string
  uploadedAt: string
  fileExtension: string
  sizeInMB: number
}

export interface VideoUploadResult {
  success: boolean
  metadata?: VideoMetadata
  error?: string
}

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/avi', 
  'video/mov',
  'video/quicktime',
  'video/wmv',
  'video/webm',
  'video/mkv',
  'video/x-msvideo'
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export const validateVideoFile = (file: Express.Multer.File): { isValid: boolean; error?: string } => {
  console.log('Validating file:', {
    mimetype: file.mimetype,
    size: file.size,
    originalname: file.originalname
  })

  // Check file type
  if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    return {
      isValid: false,
      error: `Invalid file type: ${file.mimetype}. Only video files are allowed (MP4, AVI, MOV, WMV, WebM, MKV)`
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 100MB`
    }
  }

  return { isValid: true }
}

export const extractVideoMetadata = async (file: Express.Multer.File): Promise<VideoMetadata> => {
  const metadata: VideoMetadata = {
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    sizeInMB: parseFloat((file.size / 1024 / 1024).toFixed(2)),
    mimeType: file.mimetype,
    fileExtension: path.extname(file.originalname),
    uploadedAt: new Date().toISOString()
  }

  return metadata
}

export const processVideoUpload = async (
  file: Express.Multer.File, 
  additionalInfo?: string
): Promise<VideoUploadResult> => {
  try {
    console.log('Processing video upload...')
    
    // Validate file
    const validation = validateVideoFile(file)
    if (!validation.isValid) {
      // Clean up uploaded file if validation fails
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
      return {
        success: false,
        error: validation.error
      }
    }

    // Extract metadata
    const metadata = await extractVideoMetadata(file)

    // Log the information
    console.log('=== VIDEO UPLOAD PROCESSED ===')
    console.log('Video Metadata:', JSON.stringify(metadata, null, 2))
    if (additionalInfo) {
      console.log('Additional Information:', additionalInfo)
    }
    console.log('File saved at:', file.path)
    console.log('===============================')

    return {
      success: true,
      metadata
    }
  } catch (error) {
    // Clean up file if processing fails
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path)
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during video processing'
    }
  }
}