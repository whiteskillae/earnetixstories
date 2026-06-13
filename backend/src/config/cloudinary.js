const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Setup Multer memory storage
const storage = multer.memoryStorage();

const uploadOptions = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB absolute upload limit, Sharp reduces it further
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png, gif, webp) are allowed!'));
    }
  },
});

// Configure Cloudinary
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'mock' &&
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_KEY !== 'mock' &&
  process.env.CLOUDINARY_API_SECRET && 
  process.env.CLOUDINARY_API_SECRET !== 'mock';

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[Upload] Cloudinary configured successfully.');
} else {
  console.log('[Upload] Cloudinary credentials missing or mock. Falling back to local disk storage.');
}

/**
 * Upload an image buffer
 * @param {Buffer} fileBuffer The file buffer
 * @param {string} originalName The original filename
 * @param {string} folder Target folder name
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadImage = async (fileBuffer, originalName, folder = 'blog_platform') => {
  // Process the buffer with sharp
  // This validates magic bytes, strips EXIF metadata, and compresses to WebP
  let processedBuffer;
  try {
    let pipeline = sharp(fileBuffer);
    
    if (folder === 'avatars') {
      pipeline = pipeline.resize(400, 400, { fit: 'cover' }); // Resize avatars to standard square
    } else {
      pipeline = pipeline.resize(1920, 1080, { fit: 'inside', withoutEnlargement: true }); // Constrain blog images
    }

    processedBuffer = await pipeline
      .webp({ quality: 80 }) // Convert to optimized WebP
      .toBuffer();
  } catch (error) {
    throw new Error('Invalid or corrupted image file');
  }

  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );
      uploadStream.end(processedBuffer);
    });
  } else {
    // Local storage fallback
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
    const filePath = path.join(uploadsDir, fileName);
    
    await fs.promises.writeFile(filePath, processedBuffer);
    
    // In dev, serve locally
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const localUrl = `${serverUrl}/uploads/${fileName}`;
    
    return {
      url: localUrl,
      publicId: fileName, // Use filename as local identifier
    };
  }
};

/**
 * Delete an image
 * @param {string} publicId Cloudinary public_id or local filename
 * @returns {Promise<boolean>}
 */
const deleteImage = async (publicId) => {
  if (!publicId) return false;
  
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (err) {
      console.error(`[Upload] Failed to delete image ${publicId} from Cloudinary:`, err.message);
      return false;
    }
  } else {
    try {
      const filePath = path.join(uploadsDir, publicId);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`[Upload] Failed to delete local image ${publicId}:`, err.message);
      return false;
    }
  }
};

module.exports = {
  uploadOptions,
  uploadImage,
  deleteImage,
};
