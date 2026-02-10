import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudioCopyright() {
  const navigate = useNavigate();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-semibold mb-8">Content detection</h1>

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b border-gray-700">
        <button className="pb-3 px-2 border-b-2 border-white">Copyright</button>
      </div>

      {showRequestForm ? (
        <div className="max-w-lg bg-[#212121] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">New copyright removal request</h2>
          <p className="text-sm text-gray-400 mb-4">
            Describe the copyrighted content and provide the URLs of the infringing videos.
          </p>
          <textarea
            placeholder="Describe the issue..."
            rows={4}
            className="w-full px-4 py-3 bg-[#3d3d3d] rounded border border-gray-700 focus:border-blue-500 outline-none resize-none text-white mb-4"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setShowRequestForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => { alert('Request submitted'); setShowRequestForm(false); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Submit request
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Copyright Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Copyright</h2>
              <button
                onClick={() => setShowRequestForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                New removal request
              </button>
            </div>

            <div className="bg-[#212121] rounded-lg p-4 mb-4">
              <button
                onClick={() => setShowRequests(!showRequests)}
                className="px-4 py-2 bg-[#3d3d3d] hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Removal requests
              </button>
              {showRequests && (
                <div className="mt-4 p-4 bg-[#3d3d3d] rounded text-sm text-gray-400">
                  No removal requests submitted yet.
                </div>
              )}
            </div>
          </div>

          {/* Empty State */}
          <div className="text-center py-16">
            <div className="inline-block p-8 rounded-full bg-[#212121] mb-6">
              <svg className="w-24 h-24 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Nothing to see yet</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-2">
              You haven't submitted any{' '}
              <button onClick={() => setShowRequestForm(true)} className="text-blue-400 hover:underline">
                copyright takedown requests
              </button>
              .
            </p>
            <p className="text-gray-400 max-w-md mx-auto">
              Looking for a copyright claim somebody made on your video? Check{' '}
              <button onClick={() => navigate('/studio/content')} className="text-blue-400 hover:underline">
                the video list
              </button>
              .
            </p>
          </div>
        </>
      )}
    </div>
  );
}
