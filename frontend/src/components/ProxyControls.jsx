import { Power, Trash2 } from 'lucide-react';

export function ProxyControls({
  isProxyActive,
  onToggleProxy,
  requestCount
}) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">Interceptor</h1>
          <span className="text-sm text-gray-500">
            {requestCount} {requestCount === 1 ? 'request' : 'requests'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleProxy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isProxyActive
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            <Power size={18} />
            {isProxyActive ? 'Stop Proxy' : 'Start Proxy'}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isProxyActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
        <span className="text-sm text-gray-600">
          Proxy is {isProxyActive ? 'running' : 'stopped'}
        </span>
      </div>
    </div>
  );
}
