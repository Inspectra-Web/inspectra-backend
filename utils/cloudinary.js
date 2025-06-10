import { v2 as cloudinary } from 'cloudinary';
import { envConfig } from '../configuration/environmentConfig.js';

cloudinary.config({
  cloud_name: envConfig.CLOUD_NAME,
  api_key: envConfig.API_KEY,
  api_secret: envConfig.API_SECRET,
});

export default cloudinary;
