import { Shield, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { RadarChart } from './RadarChart';

const defaultProbabilities = {
  Normal: 0,
  SQLi: 0,
  XSS: 0,
  'Command Injection': 0
};

export function ResultsPanel({ result }) {
  if (!result) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Enter a request and click analyze to see results</p>
        </div>
      </div>
    );
  }

  const probabilities = { ...defaultProbabilities, ...(result.probabilities || {}) };
  const requestDetails = result.requestDetails;
  const detectedPatterns = result.maliciousPatterns || [];
  const features = result.features;

  const getThreatLevel = (prediction) => {
    if (prediction === 'Normal') return 'safe';
    if (result.confidence > 0.7) return 'critical';
    if (result.confidence > 0.4) return 'high';
    return 'medium';
  };

  const threatLevel = getThreatLevel(result.prediction);

  const getStatusColor = () => {
    switch (threatLevel) {
      case 'safe': return 'bg-green-50 border-green-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      case 'high': return 'bg-orange-50 border-orange-200';
      case 'critical': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (threatLevel) {
      case 'safe': return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'medium': return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
      case 'high': return <AlertTriangle className="w-8 h-8 text-orange-600" />;
      case 'critical': return <XCircle className="w-8 h-8 text-red-600" />;
    }
  };

  const getStatusText = () => {
    switch (threatLevel) {
      case 'safe': return { label: 'Safe', color: 'text-green-700' };
      case 'medium': return { label: 'Medium Threat', color: 'text-yellow-700' };
      case 'high': return { label: 'High Threat', color: 'text-orange-700' };
      case 'critical': return { label: 'Critical Threat', color: 'text-red-700' };
    }
  };

  const status = getStatusText();

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Analysis Results</h2>
      </div>

      <div className={`rounded-xl border-2 p-6 mb-6 ${getStatusColor()}`}>
        <div className="flex items-center gap-4 mb-4">
          {getStatusIcon()}
          <div>
            <p className="text-sm font-medium text-gray-600">Detection Result</p>
            <p className={`text-2xl font-bold ${status?.color}`}>
              {result.prediction}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Threat Level:</span>
          <span className={`text-sm font-bold ${status?.color} uppercase tracking-wide`}>
            {status?.label}
          </span>
          <span className="ml-auto text-sm text-gray-600">
            Confidence: {(result.confidence * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Probability Distribution</h3>
        <RadarChart data={probabilities} />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Detailed Probabilities</h3>
        <div className="space-y-2">
          {Object.entries(probabilities).map(([type, prob]) => (
            <div key={type} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 w-32">{type}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    type === 'Normal' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${prob * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                {(prob * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {detectedPatterns.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Detected Malicious Patterns</h3>
          <div className="flex flex-wrap gap-2">
            {detectedPatterns.map((pattern, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-mono font-medium border border-red-200"
              >
                {pattern}
              </span>
            ))}
          </div>
        </div>
      )}

      {features && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Extracted Features</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(features).map(([key, value]) => (
              <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">{key}</p>
                <p className="text-lg font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {requestDetails && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Parsed Request</h3>
          <div className="space-y-2 text-sm bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-auto">
            <p><span className="font-semibold text-gray-700">Method:</span> {requestDetails.method}</p>
            <p className="break-all">
              <span className="font-semibold text-gray-700">URL:</span> {requestDetails.url}
            </p>
            {Object.keys(requestDetails.headers || {}).length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 mb-1">Headers:</p>
                <pre className="bg-white border border-gray-200 rounded-lg p-3 overflow-auto max-h-48">
{JSON.stringify(requestDetails.headers, null, 2)}
                </pre>
              </div>
            )}
            {requestDetails.body && (
              <div>
                <p className="font-semibold text-gray-700 mb-1">Body:</p>
                <pre className="bg-white border border-gray-200 rounded-lg p-3 overflow-auto whitespace-pre-wrap max-h-48">
{requestDetails.body}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Explanation</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{result.explanation}</p>
      </div>
    </div>
  );
}
