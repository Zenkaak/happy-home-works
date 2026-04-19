import { Bell, Clock, User, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

const Header = () => {
  return (
    <header className="sticky top-0 z-40 glass px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-lg glow-primary">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-extrabold tracking-tight">
              DAS<span className="text-primary">NET</span>
            </span>
            <span className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Dasnet Ventures
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-lg p-2.5 transition-colors hover:bg-secondary"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-primary" />
          </button>
          <Link
            to="/history"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors hover:bg-secondary"
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold tracking-wide text-muted-foreground">
              HISTORY
            </span>
          </Link>
          <Link
            to="/admin"
            aria-label="Admin login"
            className="rounded-lg p-2.5 transition-colors hover:bg-secondary"
          >
            <User className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
