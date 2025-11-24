import { Link, useLocation } from "react-router-dom";

const tabs = [
  { label: "Dashboard", path: "/" },
  { label: "Interceptor", path: "/intercepter" },
  { label: "Analyzer", path: "/request-analyzer" },
];

export function Header() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
            Sentinel WAF
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
            Security Console
          </span>
        </div>

        <nav className="flex items-center gap-1 text-sm text-slate-600">
          {tabs.map(({ label, path }) => {
            const isActive = pathname === path;
            return (
              <Link
                key={label}
                to={path}
                className={`rounded-full px-4 py-1.5 transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
