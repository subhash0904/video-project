import { useState } from 'react';

export default function StudioFeedback() {
  const [category, setCategory] = useState('bug');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    // In production, this would POST to an API endpoint
    console.log('Feedback submitted:', { category, message });
    setSubmitted(true);
    setMessage('');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Send feedback</h1>
      <p className="text-neutral-600 mb-6">Help us improve your Studio experience</p>

      {submitted ? (
        <div className="max-w-lg bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">✓</div>
          <h2 className="text-lg font-semibold text-green-800 mb-1">Thank you for your feedback!</h2>
          <p className="text-green-700 text-sm mb-4">We'll review your submission and work on improvements.</p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            Send more feedback
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="bug">Bug report</option>
              <option value="feature">Feature request</option>
              <option value="performance">Performance issue</option>
              <option value="ui">UI / Design feedback</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Describe your feedback</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={2000}
              placeholder="Tell us what's on your mind..."
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
            />
            <p className="text-xs text-neutral-400 mt-1">{message.length}/2000</p>
          </div>

          <button
            type="submit"
            disabled={!message.trim()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit feedback
          </button>
        </form>
      )}
    </div>
  );
}
