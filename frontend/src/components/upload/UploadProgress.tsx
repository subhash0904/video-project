import { useState, useEffect } from 'react';
import { realtimeService } from '../../utils/realtimeService';

interface ProcessingStage {
  stage: 'QUEUED' | 'VALIDATING' | 'TRANSCODING' | 'GENERATING_THUMBNAILS' | 'PUBLISHING' | 'READY' | 'FAILED';
  progress: number;
  message?: string;
}

const STAGE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  QUEUED:                { label: 'Queued',          icon: '⏳', color: 'text-yellow-600' },
  VALIDATING:            { label: 'Validating',      icon: '🔍', color: 'text-blue-600' },
  TRANSCODING:           { label: 'Transcoding',     icon: '🎞️',  color: 'text-purple-600' },
  GENERATING_THUMBNAILS: { label: 'Thumbnails',      icon: '🖼️',  color: 'text-teal-600' },
  PUBLISHING:            { label: 'Publishing',      icon: '🚀', color: 'text-indigo-600' },
  READY:                 { label: 'Ready',           icon: '✅', color: 'text-green-600' },
  FAILED:                { label: 'Failed',          icon: '❌', color: 'text-red-600' },
};

interface Props {
  videoId: string;
  onComplete?: () => void;
}

export default function UploadProgress({ videoId, onComplete }: Props) {
  const [status, setStatus] = useState<ProcessingStage>({ stage: 'QUEUED', progress: 0 });

  useEffect(() => {
    const handleUpdate = (data: ProcessingStage & { videoId: string }) => {
      if (data.videoId === videoId) {
        setStatus({ stage: data.stage, progress: data.progress, message: data.message });
        if (data.stage === 'READY') onComplete?.();
      }
    };

    const socket = realtimeService.getSocket();
    socket?.on('processing:status', handleUpdate);

    return () => {
      socket?.off('processing:status', handleUpdate);
    };
  }, [videoId, onComplete]);

  const cfg = STAGE_CONFIG[status.stage] || STAGE_CONFIG.QUEUED;
  const pct = Math.min(100, Math.max(0, Math.round(status.progress)));

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 w-full">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cfg.icon}</span>
          <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
        </div>
        <span className="text-sm font-mono text-neutral-500">{pct}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status.stage === 'FAILED'
              ? 'bg-red-500'
              : status.stage === 'READY'
                ? 'bg-green-500'
                : 'bg-blue-600'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Pipeline Steps */}
      <div className="flex items-center justify-between mt-3">
        {['QUEUED', 'VALIDATING', 'TRANSCODING', 'GENERATING_THUMBNAILS', 'PUBLISHING', 'READY'].map((s, i) => {
          const stages = ['QUEUED', 'VALIDATING', 'TRANSCODING', 'GENERATING_THUMBNAILS', 'PUBLISHING', 'READY'];
          const currentIdx = stages.indexOf(status.stage);
          const stepDone = i < currentIdx || status.stage === 'READY';
          const stepActive = i === currentIdx && status.stage !== 'FAILED';
          const stepFail = status.stage === 'FAILED' && i === currentIdx;

          return (
            <div key={s} className="flex flex-col items-center flex-1">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  stepFail
                    ? 'border-red-500 bg-red-500 text-white'
                    : stepDone
                      ? 'border-green-500 bg-green-500 text-white'
                      : stepActive
                        ? 'border-blue-600 bg-blue-600 text-white animate-pulse'
                        : 'border-neutral-300 bg-white text-neutral-400'
                }`}
              >
                {stepDone ? '✓' : stepFail ? '!' : i + 1}
              </div>
              <span
                className={`text-[9px] mt-1 text-center leading-tight ${
                  stepActive ? 'font-semibold text-neutral-900' : 'text-neutral-400'
                }`}
              >
                {STAGE_CONFIG[s]?.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Message */}
      {status.message && status.stage === 'FAILED' && (
        <p className="text-xs text-red-600 mt-3 bg-red-50 rounded-lg p-2">{status.message}</p>
      )}
    </div>
  );
}
