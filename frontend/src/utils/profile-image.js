export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);

export const validateProfileImage = (file) => {
    if (!file) return 'Choose an image to upload.';

    const extension = file.name?.split('.').pop()?.toLowerCase();
    if (!allowedMimeTypes.has(file.type) || !allowedExtensions.has(extension)) {
        return 'Choose a JPG, JPEG, PNG, or WebP image.';
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
        return 'Profile image must be 5 MB or smaller.';
    }
    return '';
};

export const calculateUploadProgress = (loaded, total) => {
    if (!Number.isFinite(loaded) || !Number.isFinite(total) || total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((loaded * 100) / total)));
};

export const getUploadErrorMessage = (error) => (
    error.response?.data?.message || 'Upload failed. Check your connection and try again.'
);
