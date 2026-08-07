const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('node:stream');

const configureCloudinary = () => {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        const error = new Error('Cloudinary is not configured');
        error.status = 503;
        throw error;
    }

    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true
    });
};

const uploadProfileImage = async (buffer, userId) => {
    configureCloudinary();

    return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
            {
                folder: 'servigo/profile-images',
                public_id: `${userId}-${Date.now()}`,
                resource_type: 'image',
                overwrite: false,
                transformation: [
                    { width: 800, height: 800, crop: 'limit' },
                    { quality: 'auto', fetch_format: 'auto' }
                ]
            },
            (error, result) => {
                if (error) return reject(error);
                if (!result?.secure_url || !result?.public_id) {
                    return reject(new Error('Cloudinary returned an incomplete upload result'));
                }
                resolve({ secureUrl: result.secure_url, publicId: result.public_id });
            }
        );

        Readable.from(buffer).pipe(upload);
    });
};

const destroyImage = async (publicId) => {
    if (!publicId) return;
    configureCloudinary();
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
};

module.exports = { uploadProfileImage, destroyImage };
