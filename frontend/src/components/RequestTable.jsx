import { ArrowRight } from 'lucide-react';

export function RequestTable({ requests, selectedRequest, onSelectRequest }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'text-blue-600 bg-blue-50',
      POST: 'text-emerald-600 bg-emerald-50',
      PUT: 'text-orange-600 bg-orange-50',
      DELETE: 'text-red-600 bg-red-50',
      PATCH: 'text-purple-600 bg-purple-50',
    };
    return colors[method] || 'text-gray-600 bg-gray-50';
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-gray-600';
    if (status >= 200 && status < 300) return 'text-emerald-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Direction
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Method
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              URL
            </th>
            {/* <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Malicious Prob.
            </th> */}
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Length
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {requests.map((request) => (
            <tr
              key={request.id}
              onClick={() => onSelectRequest(request)}
              className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedRequest?.id === request.id ? 'bg-blue-50' : ''
                }`}
            >
              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                {formatTime(request.created_at)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={
                    request.malicious
                      ? "inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-300"
                      : "inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-300"
                  }
                >
                  {request.malicious ? "Malicious" : "Benign"}
                </span>
              </td>

              <td className="px-4 py-3 text-sm whitespace-nowrap">
                <div className="flex items-center gap-1 text-gray-600 justify-center">
                  <ArrowRight size={16} />
                  <span>Request</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm whitespace-nowrap">
                <span className={`px-2 py-1 rounded font-medium ${getMethodColor(request.method)}`}>
                  {request.method}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-md">
                {request.url}
              </td>
              {/* <td className="px-4 py-3 text-sm whitespace-nowrap">
                <span className={`font-medium ${getStatusColor(request.status_code)}`}>
                  {request.status_code || '-'}
                </span>
              </td> */}
              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                {request?.body?.length}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {requests.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-gray-500 text-lg">No requests captured yet</p>
            <p className="text-gray-400 text-sm mt-2">Start the proxy to intercept requests</p>
          </div>
        </div>
      )}
    </div>
  );
}
