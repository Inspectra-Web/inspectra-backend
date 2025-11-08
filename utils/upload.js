import multer from 'multer';
import streamifier from 'streamifier';
import sharp from 'sharp';
import cloudinary from '../utils/cloudinary.js';
import AppError from './appError.js';

export const multerFilter = (req, file, cb) => {
  const isImageOrPDF = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
  const isVideo = file.mimetype.startsWith('video/');
  if (isImageOrPDF || isVideo) cb(null, true);
  else cb(new AppError('Only image, video and PDF files are allowed!', 400), false);
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: multerFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const resizeImage = async (
  buffer,
  width = 500,
  height = 500,
  options = { fitMode: 'cover', preserveAspect: false }
) => {
  try {
    const image = sharp(buffer);

    if (options.preserveAspect) {
      const metadata = await image.metadata();

      const isPortrait = metadata.height > metadata.width;

      const resizeTo = isPortrait ? { width: 800, height: 1200 } : { width: 1600, height: 800 };

      return await image
        .resize(resizeTo.width, resizeTo.height, { fit: 'inside', withoutEnlargement: true })
        .toFormat('jpeg')
        .toBuffer();
    }

    return await image
      .resize(width, height, {
        fit: options.fitMode || 'cover',
        position: 'top',
      })
      .toFormat('jpeg')
      .toBuffer();
  } catch (error) {
    console.error('Sharp resizeImage error:', error.message);

    // Optional: throw a more descriptive error or handle differently
    throw new Error('Invalid or corrupted image buffer');
  }
};

export const uploadToCloudinary = (buffer, folder, resource_type = 'image') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId, resourceType = 'image') =>
  new Promise((resolve, reject) =>
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    })
  );

export const getFileInfo = async publicId => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result.bytes;
  } catch (error) {
    console.error(error);
  }
};
