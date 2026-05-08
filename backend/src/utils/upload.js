import multer from 'multer';

const storage = multer.memoryStorage();

// Fix #13 & #14: unified upload handler supporting both images and videos
// Limit raised to 10MB to match the frontend UI label
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ];
  if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPG, PNG, WebP images and MP4/MOV/WebM videos are allowed'));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — matches frontend label
});
