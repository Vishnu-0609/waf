import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Clock3,
  Globe2,
  RefreshCw,
  Shield,
  ListChecks
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const PIE_COLORS = ['#f97316', '#0ea5e9', '#a855f7', '#22c55e', '#fbbf24'];

const STATUS_STYLES = {
  blocked: 'text-rose-700 bg-rose-50 border border-rose-200',
  forwarded: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
  pending: 'text-amber-700 bg-amber-50 border border-amber-200'
};

const formatter = (value) => (value ?? 0).toLocaleString();

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${backendUrl}/dashboard-stats`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to load dashboard metrics');
      }
      const data = await res.json();
      setStats(data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Unexpected error while loading dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 15000);
    return () => clearInterval(id);
  }, [fetchStats]);

  const trafficData = stats?.trafficSeries ?? [];
  const blacklist = stats?.blacklist ?? [];
  const recentRequests = stats?.recentRequests ?? [];
  const totals = stats?.totals ?? { requests: 0, blocked: 0, forwarded: 0, pending: 0, detectionRate: 0, uniqueTargets: 0 };
  const attackDistribution = useMemo(() => {
    if (!stats?.attackDistribution) return [];
    return Object.entries(stats.attackDistribution)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [stats]);

  const summaryCards = [
    {
      label: 'Total Requests',
      value: formatter(totals.requests),
      subtext: 'Last 1,000 events',
      icon: Activity
    },
    {
      label: 'Requests Blocked',
      value: formatter(totals.blocked),
      subtext: `Detection rate ${(totals.detectionRate * 100 || 0).toFixed(1)}%`,
      icon: ShieldCheck
    },
    {
      label: 'Clean Traffic',
      value: formatter(totals.forwarded),
      subtext: 'Forwarded upstream',
      icon: Shield
    },
    {
      label: 'Pending Review',
      value: formatter(totals.pending),
      subtext: 'Awaiting analyst action',
      icon: Clock3
    },
    {
      label: 'Unique Targets',
      value: formatter(totals.uniqueTargets),
      subtext: 'Applications protected',
      icon: Globe2
    }
  ];

  const initialLoading = !stats && loading;
  const isRefreshing = Boolean(stats && loading);

  return (
    <div className="h-full overflow-auto bg-linear-to-b from-slate-100 via-slate-50 to-slate-200 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Overview</p>
            <h1 className="text-3xl font-semibold text-slate-900">Cloud WAF Control Plane</h1>
            <p className="text-sm text-slate-500">
              Real-time threat telemetry aggregated from your protected origins
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-slate-500">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchStats}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-white"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => {
            const IconComponent = card.icon;
            return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-[0_15px_35px_-25px_rgba(15,23,42,0.35)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                  <IconComponent className="h-5 w-5 text-slate-600" />
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">{card.subtext}</p>
            </div>
          )})}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-linear-to-br from-white via-slate-50 to-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Traffic Pulse</p>
                <h3 className="text-lg font-semibold text-slate-900">Requests vs Blocked (12h)</h3>
              </div>
            </div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="blockedGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius:'5px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#0ea5e9"
                    fillOpacity={1}
                    fill="url(#totalGradient)"
                    name="Total"
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    stroke="#f97316"
                    fillOpacity={1}
                    fill="url(#blockedGradient)"
                    name="Blocked"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-white via-slate-50 to-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Threat Mix</p>
                <h3 className="text-lg font-semibold text-slate-900">Attack Distribution</h3>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="mt-4 h-64">
              {attackDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attackDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {attackDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#9b9ea3', border: '1px solid #1e293b', borderRadius:'5px' }}
                      labelStyle={{ color: '#e2e8f0', borderRadius:'100px' }}
                      formatter={(value, name) => [`${value}`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No hostile payloads detected yet.
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {attackDistribution.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    {item.name}
                  </div>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-white via-slate-50 to-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Blacklist</p>
                <h3 className="text-lg font-semibold text-slate-900">Active Payload Blocks</h3>
              </div>
              <ListChecks className="h-5 w-5 text-slate-600" />
            </div>
            <div className="mt-5 space-y-4">
              {blacklist.length === 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  No signatures have been blacklisted in the latest batch.
                </div>
              )}
              {blacklist.map((payload) => (
                <div
                  key={payload.id}
                  className="rounded-2xl border border-slate-100 bg-slate-100/80 p-4 shadow-inner shadow-slate-200/70"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {payload.method}
                      </span>
                      <span className="text-slate-900">{payload.attackType}</span>
                    </div>
                    <span className="text-rose-600">
                      {(payload.probability * 100).toFixed(1)}% probability
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-sm text-slate-800 wrap-break-word">
                    {payload.pattern}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="break-all">{payload.url}</span>
                    <span>{payload.detected_at}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-white via-slate-50 to-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Live Stream</p>
                <h3 className="text-lg font-semibold text-slate-900">Most Recent Decisions</h3>
              </div>
              <Shield className="h-5 w-5 text-slate-600" />
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {recentRequests.map((request) => {
                const statusKey = (request.status || 'pending').toLowerCase();
                const badgeStyle = STATUS_STYLES[statusKey] || STATUS_STYLES.pending;
                return (
                  <div key={request.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {request.method}
                        </span>
                        <span className="text-slate-900">{request.attackType}</span>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStyle}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-2 break-all text-sm text-slate-600">{request.url}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Confidence {(request.malicious_prob * 100).toFixed(1)}%
                      </span>
                      <span>{request.created_at}</span>
                    </div>
                  </div>
                );
              })}
              {recentRequests.length === 0 && (
                <div className="py-6 text-center text-sm text-slate-500">
                  Waiting for inbound traffic...
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      {initialLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur">
          <span className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600">
            Loading telemetry...
          </span>
        </div>
      )}
      {isRefreshing && (
        <div className="pointer-events-none fixed inset-0 flex items-start justify-end p-6">
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-slate-600 shadow">
            Syncing telemetry...
          </span>
        </div>
      )}
    </div>
  );
}

export default Dashboard;