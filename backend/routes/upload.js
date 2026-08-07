const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const cloudinaryService = require('../services/cloudinary');

const router = express.Router();
const maxFileSize = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: maxFileSize },
    fileFilter: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
            const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'profileImage');
            error.message = 'Only JPG, JPEG, PNG, and WebP images are allowed';
            return callback(error);
        }
        callback(null, true);
    }
});

const parseProfileImage = (req, res, next) => {
    upload.single('profileImage')(req, res, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ message: 'Profile image must be 5 MB or smaller' });
            }
            return res.status(400).json({ message: error.message });
        }

        next(error);
    });
};

router.post('/profile-image', auth, parseProfileImage, async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ message: 'A profile image is required' });
    }

    let newImage;
    try {
        const user = await User.findOne({
            _id: req.user.id,
            role: { $in: ['customer', 'worker'] }
        });
        if (!user) return res.status(404).json({ message: 'User or worker profile not found' });

        const oldPublicId = user.profileImagePublicId;
        newImage = await cloudinaryService.uploadProfileImage(req.file.buffer, user._id.toString());

        user.photoUrl = newImage.secureUrl;
        user.profileImagePublicId = newImage.publicId;

        try {
            await user.save({ validateModifiedOnly: true });
        } catch (error) {
            await cloudinaryService.destroyImage(newImage.publicId).catch(() => { });
            throw error;
        }

        let oldImageCleanupPending = false;
        if (oldPublicId && oldPublicId !== newImage.publicId) {
            try {
                await cloudinaryService.destroyImage(oldPublicId);
            } catch (error) {
                oldImageCleanupPending = true;
                console.error('Failed to delete replaced Cloudinary profile image:', error.message);
            }
        }

        res.status(200).json({
            message: 'Profile image uploaded successfully',
            photoUrl: user.photoUrl,
            profileImagePublicId: user.profileImagePublicId,
            oldImageCleanupPending
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
