import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ===========================================
// 📁 Profile Photos Storage Setup
// ===========================================

const profilePhotoDir = 'uploads/profile_photos';
if (!fs.existsSync(profilePhotoDir)) {
  fs.mkdirSync(profilePhotoDir, { recursive: true });
}

const profilePhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profilePhotoDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  }
});

const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG and PNG images allowed'), false);
  }
});


// ===========================================
// 📁 Document Uploads Storage Setup (e.g., Aadhar, PAN)
// ===========================================

const documentDir = 'uploads/documents';
if (!fs.existsSync(documentDir)) {
  fs.mkdirSync(documentDir, { recursive: true });
}

const docStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, documentDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const field = file.fieldname; // e.g. "aadhar", "pan"
    cb(null, `${req.user.id}-${field}-${Date.now()}${ext}`);
  }
});

const uploadDocuments = multer({
  storage: docStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images or PDFs allowed'), false);
  }
});


// ===========================================
// 📦 Exports
// ===========================================

export {
  uploadProfilePhoto,   // use this for profile photo
  uploadDocuments       // use this for aadhar/pan documents
};
