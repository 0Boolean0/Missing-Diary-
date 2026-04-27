import multer from 'multer';

const storage = multer.memoryStorage();

const ALLOWED = [
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm',
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// Accept both 'images' (up to 5) and 'video' (up to 1) fields
export const upload = multerInstance;

export const uploadCaseFiles = (req, res, next) => {
  multerInstance.fields([
    { name: 'images', maxCount: 5 },
    { name: 'video',  maxCount: 1 },
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};
