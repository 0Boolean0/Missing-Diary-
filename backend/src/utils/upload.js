import multer from 'multer';

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
  
  if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WebP images and MP4, MOV, WebM videos are allowed'));
  }
};

export const upload = multer({ 
  storage, 
  fileFilter, 
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB for videos
});
