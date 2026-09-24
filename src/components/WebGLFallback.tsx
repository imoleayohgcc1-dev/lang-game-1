import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { GAME_CONFIG } from '../game/constants';

interface WebGLFallbackProps {
  errorMessage?: string;
  onRetry: () => void;
}

export const WebGLFallback: React.FC<WebGLFallbackProps> = ({
  errorMessage,
  onRetry,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950 text-white">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-display font-bold text-white mb-2">
          3D Acceleration Unavailable
        </h2>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          {errorMessage ||
            `${GAME_CONFIG.TITLE} requires WebGL hardware acceleration to render the 3D runner track. Please ensure WebGL is enabled in your browser settings.`}
        </p>

        <button
          onClick={onRetry}
          className="w-full py-3.5 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-2xl shadow-lg shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Initializing Three.js</span>
        </button>
      </div>
    </div>
  );
};
