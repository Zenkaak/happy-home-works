import { Bell, Clock, User, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass px-4 py-3">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold tracking-tight leading-none">
              DAS<span className="text-primary">NET</span>
            </span>
            <span className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase leading-none mt-0.5">
              Dasnet Ventures
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button className="p-2.5 rounded-lg hover:bg-secondary transition-colors relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
          </button>
          <button
            onClick={() => navigate("/history")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wide">HISTORY</span>
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="p-2.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <User className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
