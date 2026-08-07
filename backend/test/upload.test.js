const { after, before, beforeEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'servigo-upload-test-secret';

const app = require('../app');
const BlacklistedToken = require('../models/BlacklistedToken');
const User = require('../models/User');
const cloudinaryService = require('../services/cloudinary');

let server;
let baseUrl;
let originalBlacklistLookup;
let originalUserLookup;
let originalUpload;
let originalDestroy;

const userId = '507f1f77bcf86cd799439101';
const authHeader = (role = 'customer') => ({
    authorization: `Bearer ${jwt.sign({ id: userId, role }, process.env.JWT_SECRET)}`
});

const imageForm = ({ name = 'profile.jpg', type = 'image/jpeg', bytes = [255, 216, 255] } = {}) => {
    const form = new FormData();
    form.append('profileImage', new Blob([Uint8Array.from(bytes)], { type }), name);
    return form;
};

before(async () => {
    originalBlacklistLookup = BlacklistedToken.findOne;
    originalUserLookup = User.findOne;
    originalUpload = cloudinaryService.uploadProfileImage;
    originalDestroy = cloudinaryService.destroyImage;

    server = http.createServer(app);
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
    BlacklistedToken.findOne = async () => null;
    User.findOne = async () => null;
    cloudinaryService.uploadProfileImage = async () => ({
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/new-profile.jpg',
        publicId: 'servigo/profile-images/new-profile'
    });
    cloudinaryService.destroyImage = async () => { };
});

after(async () => {
    BlacklistedToken.findOne = originalBlacklistLookup;
    User.findOne = originalUserLookup;
    cloudinaryService.uploadProfileImage = originalUpload;
    cloudinaryService.destroyImage = originalDestroy;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

describe('POST /api/upload/profile-image', () => {
    it('requires authentication before parsing an upload', async () => {
        const response = await fetch(`${baseUrl}/api/upload/profile-image`, {
            method: 'POST',
            body: imageForm()
        });

        assert.equal(response.status, 401);
    });

    it('requires the profileImage multipart field', async () => {
        const response = await fetch(`${baseUrl}/api/upload/profile-image`, {
            method: 'POST',
            headers: authHeader(),
            body: new FormData()
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.match(body.message, /required/i);
    });

    it('rejects unsupported image MIME types and extensions', async () => {
        for (const file of [
            { name: 'profile.gif', type: 'image/gif' },
            { name: 'profile.jpg', type: 'application/octet-stream' },
            { name: 'profile.exe', type: 'image/jpeg' }
        ]) {
            const response = await fetch(`${baseUrl}/api/upload/profile-image`, {
                method: 'POST',
                headers: authHeader(),
                body: imageForm(file)
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.match(body.message, /JPG.*PNG.*WebP/i);
        }
    });

    it('rejects files larger than 5 MB', async () => {
        const form = new FormData();
        form.append(
            'profileImage',
            new Blob([new Uint8Array((5 * 1024 * 1024) + 1)], { type: 'image/png' }),
            'large.png'
        );
        const response = await fetch(`${baseUrl}/api/upload/profile-image`, {
            method: 'POST',
            headers: authHeader(),
            body: form
        });
        const body = await response.json();

        assert.equal(response.status, 413);
        assert.match(body.message, /5 MB/i);
    });

    it('uploads and persists only Cloudinary metadata for a customer', async () => {
        let uploadedBuffer;
        let uploadedUserId;
        let saved = false;
        const user = {
            _id: { toString: () => userId },
            role: 'customer',
            photoUrl: '',
            profileImagePublicId: '',
            async save(options) {
                saved = true;
                assert.deepEqual(options, { validateModifiedOnly: true });
            }
        };
        User.findOne = async (query) => {
            assert.equal(query._id, userId);
            assert.deepEqual(query.role.$in, ['customer', 'worker']);
            return user;
        };
        cloudinaryService.uploadProfileImage = async (buffer, id) => {
            uploadedBuffer = buffer;
            uploadedUserId = id;
            return {
                secureUrl: 'https://res.cloudinary.com/demo/image/upload/customer.jpg',
                publicId: 'servigo/profile-images/customer'
            };
        };

        const response = await fetch(`${baseUrl}/api/upload/profile-image`, {
            method: 'POST',
            headers: authHeader('customer'),
            body: imageForm()
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(Buffer.isBuffer(uploadedBuffer), true);
        assert.equal(uploadedUserId, userId);
        assert.equal(saved, true);
        assert.equal(user.photoUrl, body.photoUrl);
        assert.equal(user.profileImagePublicId, body.profileImagePublicId);
        assert.equal(body.oldImageCleanupPending, false);
    });

    it('persists a worker replacement before deleting the old asset', async () => {
        const events = [];
        const user = {
            _id: { toString: () => userId },
            role: 'worker',
            photoUrl: 'https://res.cloudinary.com/demo/image/upload/old.jpg',
            profileImagePublicId: 'servigo/profile-images/old',
            async save() { events.push('saved-new'); }
        };
        User.findOne = async () => user;
        cloudinaryService.uploadProfileImage = async () => {
            events.push('uploaded-new');
            return {
                secureUrl: 'https://res.cloudinary.com/demo/image/upload/new.webp',
                publicId: 'servigo/profile-images/new'
            };
        };
        cloudinaryService.destroyImage = async (publicId) => events.push(`deleted:${publicId}`);

        const response = await fetch(`${baseUrl}/api/upload/profile-image`, {
            method: 'POST',
            headers: authHeader('worker'),
            body: imageForm({ name: 'profile.webp', type: 'image/webp' })
        });

        assert.equal(response.status, 200);
        assert.deepEqual(events, [
            'uploaded-new',
            'saved-new',
            'deleted:servigo/profile-images/old'
        ]);
    });

    it('deletes the new asset and keeps the old asset when persistence fails', async () => {
        const destroyed = [];
        const user = {
            _id: { toString: () => userId },
            role: 'customer',
            profileImagePublicId: 'servigo/profile-images/old',
            async save() { throw new Error('MongoDB write failed'); }
        };
        User.findOne = async () => user;
        cloudinaryService.destroyImage = async (publicId) => destroyed.push(publicId);

        const response = await fetch(`${baseUrl}/api/upload/profile-image`, {
            method: 'POST',
            headers: authHeader(),
            body: imageForm({ name: 'profile.png', type: 'image/png' })
        });

        assert.equal(response.status, 500);
        assert.deepEqual(destroyed, ['servigo/profile-images/new-profile']);
        assert.equal(destroyed.includes('servigo/profile-images/old'), false);
    });

    it('keeps the successful replacement when old-asset cleanup must be retried later', async () => {
        const user = {
            _id: { toString: () => userId },
            role: 'worker',
            profileImagePublicId: 'servigo/profile-images/old',
            async save() { }
        };
        User.findOne = async () => user;
        cloudinaryService.destroyImage = async () => { throw new Error('Cloudinary unavailable'); };

        const response = await fetch(`${baseUrl}/api/upload/profile-image`, {
            method: 'POST',
            headers: authHeader('worker'),
            body: imageForm()
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.oldImageCleanupPending, true);
        assert.equal(body.profileImagePublicId, 'servigo/profile-images/new-profile');
    });
});
