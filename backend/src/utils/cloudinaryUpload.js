import cloudinary from '../config/cloudinary.js';

export function uploadBufferToCloudinary(buffer, folder = 'missing-diary', resourceType = 'auto') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder,
        resource_type: resourceType
      }, 
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}
