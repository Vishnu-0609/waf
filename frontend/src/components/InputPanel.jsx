import { AlertCircle } from 'lucide-react';

export function InputPanel({ input, onInputChange, onAnalyze, loading }) {
  const examples = [
    { label: 'Normal Request', value: 'GET /api/users?id=123' },
    { label: 'SQL Injection', value: "admin' OR '1'='1' --" },
    { label: 'XSS Attack', value: '<script>alert(document.cookie)</script>' },
    { label: 'Command Injection', value: '; cat /etc/passwd' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <AlertCircle className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Request Input</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter URL, Payload, or Request Data
          </label>
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Paste your URL, query parameter, or request payload here..."
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
          />
        </div>

        <button
          onClick={onAnalyze}
          disabled={!input.trim() || loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {loading ? 'Analyzing...' : 'Analyze Request'}
        </button>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Quick Examples:</p>
          <div className="grid grid-cols-2 gap-2">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => onInputChange(example.value)}
                className="text-left text-sm px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-150 border border-gray-200"
              >
                <span className="font-medium text-gray-700">{example.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
