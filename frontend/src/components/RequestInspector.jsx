import { useEffect, useMemo, useState } from 'react';
import { X, Play, Plus, Trash2 } from 'lucide-react';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const defaultBackend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const toHeaderList = (headers = {}) =>
  Object.entries(headers).map(([name, value], index) => ({
    id: `${name}-${index}-${Date.now()}`,
    name,
    value
  }));

const toHeaderObject = (headerList = []) =>
  headerList.reduce((acc, item) => {
    if (item.name) {
      acc[item.name] = item.value ?? '';
    }
    return acc;
  }, {});

export function RequestInspector({ request, onClose }) {
  const [activeTab, setActiveTab] = useState('request');
  const [viewMode, setViewMode] = useState('pretty');
  const [editable, setEditable] = useState(null);
  const [responsePreview, setResponsePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!request) {
      setEditable(null);
      setResponsePreview(null);
      setError('');
      return;
    }

    setEditable({
      method: request.method || 'GET',
      url: request.url || '',
      body: request.body || request.request_body || '',
      headers: toHeaderList(request.headers || {})
    });
    setResponsePreview(null);
    setError('');
  }, [request]);

  const headerCount = editable?.headers?.length ?? 0;
  const formattedBody = useMemo(() => {
    if (!editable?.body) return '';
    if (viewMode !== 'pretty') return editable.body;
    try {
      const parsed = JSON.parse(editable.body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return editable.body;
    }
  }, [editable, viewMode]);

  if (!request || !editable) {
    return (
      <div className="w-full md:w-1/2 lg:w-2/5 bg-slate-50 border-l border-slate-200 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="text-lg">Select a request to inspect</p>
          <p className="text-sm mt-2">Click on any request from the list</p>
        </div>
      </div>
    );
  }

  const handleHeaderChange = (id, field, value) => {
    setEditable((prev) => ({
      ...prev,
      headers: prev.headers.map((header) =>
        header.id === id ? { ...header, [field]: value } : header
      )
    }));
  };

  const addHeaderRow = () => {
    setEditable((prev) => ({
      ...prev,
      headers: [
        ...prev.headers,
        { id: `hdr-${Date.now()}`, name: '', value: '' }
      ]
    }));
  };

  const removeHeaderRow = (id) => {
    setEditable((prev) => ({
      ...prev,
      headers: prev.headers.filter((header) => header.id !== id)
    }));
  };

  const handleReplay = async () => {
    if (!editable.url) {
      setError('URL is required');
      return;
    }

    setSending(true);
    setError('');
    try {
      const payload = {
        method: editable.method,
        url: editable.url,
        headers: toHeaderObject(editable.headers),
        body: editable.body || ''
      };

      const res = await fetch(`${defaultBackend}/replay-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || 'Replay failed');
      }

      const data = await res.json();
      setResponsePreview(data);
      setActiveTab('response');
    } catch (err) {
      setResponsePreview(null);
      setError(err.message || 'Unexpected error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full md:w-1/2 lg:w-2/5 bg-white border-l border-slate-200 flex flex-col">
      <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between bg-slate-50">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Inspector</p>
          <h2 className="font-semibold text-slate-900 mt-1">Request repeater</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-200 rounded-full transition-colors"
          aria-label="Close inspector"
        >
          <X size={18} className="text-slate-600" />
        </button>
      </div>

      <div className="border-b border-slate-200 px-5 py-4 bg-white">
        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <label className="text-xs font-semibold tracking-wide uppercase text-slate-500">
            Method
            <select
              value={editable.method}
              onChange={(e) =>
                setEditable((prev) => ({ ...prev, method: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              {METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold tracking-wide uppercase text-slate-500">
            Target URL
            <input
              type="text"
              value={editable.url}
              onChange={(e) =>
                setEditable((prev) => ({ ...prev, url: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="https://example.com/login"
            />
          </label>
        </div>
      </div>

      <div className="border-b border-slate-200 px-5 py-3 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 text-xs font-medium text-slate-500">
          <button
            onClick={() => setActiveTab('request')}
            className={`rounded-full px-3 py-1 transition ${
              activeTab === 'request'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Request Builder
          </button>
          <button
            onClick={() => setActiveTab('response')}
            className={`rounded-full px-3 py-1 transition ${
              activeTab === 'response'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Response Preview
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            {['pretty', 'raw', 'hex'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${
                  viewMode === mode
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            onClick={handleReplay}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
          >
            <Play className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-5 py-2 text-sm text-rose-600 bg-rose-50 border-b border-rose-100">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto px-5 py-4 space-y-6 bg-white">
        {activeTab === 'request' ? (
          <>
            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Headers</h3>
                <button
                  onClick={addHeaderRow}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add header
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">{headerCount} headers</p>

              <div className="mt-3 space-y-2">
                {editable.headers.map((header) => (
                  <div
                    key={header.id}
                    className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 flex-wrap sm:flex-nowrap"
                  >
                    <input
                      type="text"
                      value={header.name}
                      onChange={(e) =>
                        handleHeaderChange(header.id, 'name', e.target.value)
                      }
                      placeholder="Header"
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) =>
                        handleHeaderChange(header.id, 'value', e.target.value)
                      }
                      placeholder="Value"
                      className="flex-[2] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                    <button
                      onClick={() => removeHeaderRow(header.id)}
                      className="text-slate-400 hover:text-rose-500"
                      aria-label="Remove header"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Body</h3>
                <span classname="text-xs text-slate-400">
                  {editable.body?.length || 0} bytes
                </span>
              </div>
              <textarea
                value={formattedBody}
                onChange={(e) =>
                  setEditable((prev) => ({ ...prev, body: e.target.value }))
                }
                rows={12}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </section>
          </>
        ) : (
          <section className="space-y-4">
            {responsePreview ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    Response Status
                  </span>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                    {responsePreview.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Headers</h3>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50">
                    {Object.entries(responsePreview.headers || {}).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between border-b border-slate-200 px-4 py-2 last:border-b-0 text-sm text-slate-700"
                      >
                        <span className="font-medium">{key}</span>
                        <span className="text-slate-500">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Body</h3>
                  <pre className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-900 overflow-auto max-h-72">
                    {responsePreview.body || '[empty]'}
                  </pre>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-500 text-sm">
                Send the request to preview the upstream response.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}