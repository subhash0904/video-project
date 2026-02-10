import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { VIDEO_CATEGORY_OPTIONS } from '../utils/categories';

export default function Upload() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ENTERTAINMENT');
  const [ageRating, setAgeRating] = useState('13');
  const [tags, setTags] = useState('');
  const [language, setLanguage] = useState('en');
  const [isPublic, setIsPublic] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [allowSubscribers, setAllowSubscribers] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5GB max)
      if (file.size > 5 * 1024 * 1024 * 1024) {
        setError('Video file too large. Maximum size is 5GB.');
        return;
      }
      setVideoFile(file);
      setError('');
      
      // Auto-fill title from filename if empty
      if (!title) {
        const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        setTitle(fileName);
      }
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max for images)
      if (file.size > 10 * 1024 * 1024) {
        setError('Thumbnail too large. Maximum size is 10MB.');
        return;
      }
      setThumbnailFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile) {
      setError('Please select a video file');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('ageRating', ageRating);
      formData.append('tags', tags);
      formData.append('language', language);
      formData.append('isPublic', isPublic.toString());
      formData.append('allowComments', allowComments.toString());
      formData.append('allowSubscribers', allowSubscribers.toString());

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setSuccess(true);
          setUploadProgress(100);
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          const response = JSON.parse(xhr.responseText);
          setError(response.error?.message || 'Upload failed');
          setUploading(false);
        }
      });

      xhr.addEventListener('error', () => {
        setError('Network error. Please try again.');
        setUploading(false);
      });

      // Send request
      const token = apiClient.getToken();
      xhr.open('POST', `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/videos/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);

    } catch (err: unknown) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload video';
      setError(errorMessage);
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">Upload Successful!</h2>
          <p className="text-neutral-600">Your video is being processed...</p>
          <p className="text-sm text-neutral-500 mt-2">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm">
        <h1 className="text-3xl font-bold mb-2">Upload Video</h1>
        <p className="text-neutral-600 mb-8">Share your video with the world</p>

        <form onSubmit={handleSubmit} className="space-y-6">
        {/* Video File */}
        <div>
          <label className="block text-sm font-semibold mb-2">Video File *</label>
          <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-8 text-center hover:border-neutral-300 transition">
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="hidden"
              id="video-upload"
              disabled={uploading}
            />
            <label htmlFor="video-upload" className="cursor-pointer">
              {videoFile ? (
                <div>
                  <p className="text-lg font-semibold">✓ {videoFile.name}</p>
                  <p className="text-sm text-neutral-500">
                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <svg className="w-12 h-12 mx-auto mb-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-lg font-semibold">Click to upload video</p>
                  <p className="text-sm text-neutral-500 mt-2">MP4, MOV, AVI, MKV, WebM (max 5GB)</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Thumbnail (Optional) */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            Custom Thumbnail (Optional)
          </label>
          <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-6 text-center hover:border-neutral-300 transition">
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="hidden"
              id="thumbnail-upload"
              disabled={uploading}
            />
            <label htmlFor="thumbnail-upload" className="cursor-pointer">
              {thumbnailFile ? (
                <div>
                  <p className="text-sm font-semibold">✓ {thumbnailFile.name}</p>
                  <p className="text-xs text-neutral-500">
                    {(thumbnailFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">
                  Click to upload thumbnail (auto-generated if not provided)
                </p>
              )}
            </label>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold mb-2">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter an engaging video title"
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 focus:outline-none focus:border-red-600"
            disabled={uploading}
            required
          />
          <p className="text-xs text-neutral-500 mt-1">{title.length}/100</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell viewers about your video. Include links and timestamps."
            maxLength={5000}
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 focus:outline-none focus:border-red-600 resize-none"
            disabled={uploading}
          />
          <p className="text-xs text-neutral-500 mt-1">{description.length}/5000</p>
        </div>

        {/* Category and Language */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 focus:outline-none focus:border-red-600"
              disabled={uploading}
              required
            >
              {VIDEO_CATEGORY_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 focus:outline-none focus:border-red-600"
              disabled={uploading}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
              <option value="hi">Hindi</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
        </div>

        {/* Age Rating */}
        <div>
          <label className="block text-sm font-semibold mb-3">Age Rating *</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { value: '13', label: '13+', desc: 'General Audience' },
              { value: '16', label: '16+', desc: 'May contain mild content' },
              { value: '18', label: '18+', desc: 'For mature audiences only' },
            ].map((option) => (
              <label key={option.value} className="flex items-center p-3 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition">
                <input
                  type="radio"
                  name="ageRating"
                  value={option.value}
                  checked={ageRating === option.value}
                  onChange={(e) => setAgeRating(e.target.value)}
                  className="mr-3"
                  disabled={uploading}
                />
                <div>
                  <div className="font-semibold text-sm">{option.label}</div>
                  <div className="text-xs text-neutral-500">{option.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold mb-2">Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Add tags to help viewers find your video"
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 focus:outline-none focus:border-red-600"
            disabled={uploading}
          />
          <p className="text-xs text-neutral-500 mt-1">{tags.length}/500</p>
        </div>

        {/* Settings */}
        <div className="bg-neutral-50 p-4 rounded-2xl space-y-3">
          <h3 className="font-semibold text-sm mb-3">Video Settings</h3>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-5 h-5 rounded border-neutral-300"
              disabled={uploading}
            />
            <div>
              <span className="text-sm font-medium">Make video public</span>
              <p className="text-xs text-neutral-500">Anyone with a link can watch</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(e) => setAllowComments(e.target.checked)}
              className="w-5 h-5 rounded border-neutral-300"
              disabled={uploading}
            />
            <div>
              <span className="text-sm font-medium">Allow comments</span>
              <p className="text-xs text-neutral-500">Viewers can comment on your video</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowSubscribers}
              onChange={(e) => setAllowSubscribers(e.target.checked)}
              className="w-5 h-5 rounded border-neutral-300"
              disabled={uploading}
            />
            <div>
              <span className="text-sm font-medium">Allow subscribers to see this video</span>
              <p className="text-xs text-neutral-500">Exclusive to your channel subscribers</p>
            </div>
          </label>
        </div>

        {/* Preview */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 px-0 py-2"
        >
          {showPreview ? '✕ Hide Preview' : '📋 Preview'}
        </button>

        {showPreview && (
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
            <h3 className="font-semibold mb-3">Video Preview</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Title:</span> {title || '(Not set)'}</p>
              <p><span className="font-medium">Category:</span> {VIDEO_CATEGORY_OPTIONS.find(c => c.id === category)?.label}</p>
              <p><span className="font-medium">Age Rating:</span> {ageRating}+</p>
              <p><span className="font-medium">Accessibility:</span> {isPublic ? 'Public' : 'Private'}</p>
              <p><span className="font-medium">Description:</span></p>
              <p className="text-neutral-600 ml-2">{description ? description.substring(0, 100) + (description.length > 100 ? '...' : '') : '(No description)'}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Uploading...</span>
              <span className="font-semibold">{uploadProgress}%</span>
            </div>
            <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-red-500 to-red-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading || !videoFile || !title.trim()}
          className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? `Uploading ${uploadProgress}%...` : '🚀 Upload Video'}
        </button>
      </form>
      </div>
    </div>
  );
}
