import { useEffect, useId, useRef, useState } from 'react';
import { Image as ImageIcon, RefreshCw, UploadCloud } from 'lucide-react';
import api from '../services/api';
import {
    calculateUploadProgress,
    getUploadErrorMessage,
    PROFILE_IMAGE_ACCEPT,
    validateProfileImage
} from '../utils/profile-image';

const ProfileImageUpload = ({ currentUser, onUploaded, accent = 'blue' }) => {
    const inputId = useId();
    const previewUrlRef = useRef('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    const accentClass = accent === 'purple' ? 'focus:border-neon-purple' : 'focus:border-neon-blue';
    const shadowClass = accent === 'purple' ? 'shadow-glow-purple' : 'shadow-glow-blue';
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=7F5AF0&color=fff`;

    useEffect(() => () => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    }, []);

    const uploadFile = async (file) => {
        setStatus('uploading');
        setProgress(0);
        setError('');

        const formData = new FormData();
        formData.append('profileImage', file);

        try {
            const response = await api.post('/upload/profile-image', formData, {
                timeout: 60000,
                onUploadProgress: ({ loaded, total }) => {
                    setProgress(calculateUploadProgress(loaded, total));
                }
            });
            setProgress(100);
            setStatus('success');
            onUploaded(response.data);
        } catch (uploadError) {
            setStatus('error');
            setError(getUploadErrorMessage(uploadError));
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        const validationError = validateProfileImage(file);
        if (validationError) {
            setSelectedFile(null);
            setStatus('error');
            setError(validationError);
            return;
        }

        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = URL.createObjectURL(file);
        setPreviewUrl(previewUrlRef.current);
        setSelectedFile(file);
        uploadFile(file);
    };

    return (
        <div className="flex flex-col items-center gap-5">
            <div className="relative group">
                <img
                    src={previewUrl || currentUser?.photoUrl || fallback}
                    alt="Profile preview"
                    className={`w-32 h-32 rounded-full object-cover border-4 border-white ${shadowClass}`}
                />
                {status === 'uploading' && (
                    <div className="absolute inset-0 rounded-full bg-black/65 flex items-center justify-center" role="status" aria-live="polite">
                        <span className="text-white text-sm font-black">{progress}%</span>
                    </div>
                )}
            </div>

            <input
                id={inputId}
                type="file"
                accept={PROFILE_IMAGE_ACCEPT}
                onChange={handleFileChange}
                disabled={status === 'uploading'}
                className="sr-only"
            />
            <label
                htmlFor={inputId}
                className={`w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-white/10 ${accentClass} ${status === 'uploading' ? 'pointer-events-none opacity-60' : ''}`}
            >
                <span className="flex items-center justify-center gap-2">
                    {status === 'uploading' ? <RefreshCw size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                    {status === 'uploading' ? 'Uploading…' : 'Choose image'}
                </span>
            </label>

            <p className="text-center text-[10px] font-bold leading-relaxed text-white/40">
                JPG, JPEG, PNG or WebP. Maximum 5 MB.
            </p>

            {status === 'uploading' && (
                <div className="w-full" aria-label={`Upload progress: ${progress}%`}>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-gradient-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}

            {status === 'success' && (
                <p className="text-center text-xs font-bold text-neon-green" role="status">Profile image updated.</p>
            )}

            {status === 'error' && (
                <div className="w-full space-y-3 text-center" role="alert">
                    <p className="text-xs font-bold text-red-400">{error}</p>
                    {selectedFile && (
                        <button
                            type="button"
                            onClick={() => uploadFile(selectedFile)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 px-4 py-2 text-xs font-black uppercase tracking-wider text-red-300 hover:bg-red-500/10"
                        >
                            <RefreshCw size={14} />
                            Retry upload
                        </button>
                    )}
                </div>
            )}

            {status === 'idle' && <ImageIcon size={18} className="text-white/20" aria-hidden="true" />}
        </div>
    );
};

export default ProfileImageUpload;
