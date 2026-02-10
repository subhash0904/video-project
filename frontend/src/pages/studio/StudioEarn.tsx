import { useState } from 'react';

export default function StudioEarn() {
  const [verificationStarted, setVerificationStarted] = useState(false);

  const handle2StepSetup = () => {
    setVerificationStarted(true);
    // In production, this would redirect to an actual 2FA setup flow
  };

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-semibold mb-8">Earn</h1>

      <div className="max-w-3xl">
        {/* Next Milestone */}
        <div className="bg-[#212121] rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold">Next milestone 🔓</h3>
            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400 mb-4">
            Start your earning journey
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Earn income by connecting with your fans and fans and gain access to support forums and creator tools
          </p>
          <a href="#" className="text-blue-400 hover:underline text-sm">
            Learn more
          </a>
        </div>

        {/* Memberships */}
        <div className="bg-[#212121] rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Memberships</h3>
          <div className="flex items-center justify-between p-4 bg-[#3d3d3d] rounded mb-4">
            <div>
              <p className="font-medium mb-1">Grow your community and earn monthly</p>
              <p className="text-sm text-gray-400">
                Excite your audience with access to exclusive perks as a monthly paying member.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🟢</div>
              <p className="text-xs font-medium">Learn more</p>
            </div>
          </div>
        </div>

        {/* Supers */}
        <div className="bg-[#212121] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Supers</h3>
          <div className="flex items-center justify-between p-4 bg-[#3d3d3d] rounded hidden md:flex">
            <div className="flex-1">
              <p className="font-medium mb-1">Supers</p>
              <p className="text-sm text-gray-400">
                Shopping
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🛒</div>
              <p className="text-xs font-medium">Learn more</p>
            </div>
          </div>
        </div>

        {/* Eligibility */}
        <div className="mt-8 bg-[#3d3d3d] rounded-lg p-6">
          <h3 className="font-semibold mb-4">Before you apply</h3>
          {verificationStarted ? (
            <div className="bg-green-900/30 border border-green-700 rounded p-4 mb-4">
              <p className="text-green-400 text-sm font-medium">2-Step Verification setup initiated.</p>
              <p className="text-green-400/70 text-xs mt-1">Check your email to complete the process.</p>
            </div>
          ) : (
            <button
              onClick={handle2StepSetup}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              Set up 2-Step Verification
            </button>
          )}
          <p className="text-xs text-gray-400 mt-6">
            We'll check if your channel follows our{' '}
            <span className="text-blue-400">monetization policies</span>
            . If everything looks good, you're in!
          </p>
        </div>
      </div>
    </div>
  );
}
