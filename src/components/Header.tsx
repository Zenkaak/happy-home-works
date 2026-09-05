import { Clock, User, ShieldCheck, Volume2, VolumeX, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { isNotifySoundEnabled, setNotifySoundEnabled } from "@/lib/notifySound";

const Header = () => {
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(isNotifySoundEnabled());
    const onChange = () => setSoundOn(isNotifySoundEnabled());
    window.addEventListener("dasnet:notify-sound-changed", onChange);
    return () => window.removeEventListener("dasnet:notify-sound-changed", onChange);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setNotifySoundEnabled(next);
    setSoundOn(next);
  };

  return (
    <header className="sticky top-0 z-50 w-full glass px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="container flex w-full min-w-0 max-w-none items-center justify-between gap-2">
        <button
          onClick={() => navigate("/")}
          className="flex min-w-0 shrink items-center gap-2.5 group"
          aria-label="DASNET home"
        >
          <div className="relative h-10 w-10 shrink-0 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background animate-pulse" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-col items-start">
            <span className="font-display text-lg font-bold tracking-tight leading-none">
              DAS<span className="text-primary">NET</span>
            </span>
            <span className="truncate text-[9px] text-muted-foreground tracking-[0.2em] uppercase leading-none mt-0.5">
              Dasnet Ventures
            </span>
          </div>
        </button>

        <div className="flex min-w-0 shrink-0 items-center gap-0.5">
          <button
            onClick={() => navigate("/vendor")}
            className="flex items-center gap-0 rounded-lg border border-primary/25 bg-primary/10 px-2 py-2 transition-colors hover:bg-primary/15 min-[430px]:gap-1.5 min-[430px]:px-3"
            title="Become a vendor — earn 10% commission"
          >
            <Store className="w-4 h-4 text-primary" />
            <span className="hidden text-xs font-bold tracking-wide text-primary min-[430px]:inline">EARN 10%</span>
          </button>
          <button
            onClick={() => navigate("/history")}
            className="flex items-center gap-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-secondary sm:px-3"
          >
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="hidden text-xs font-semibold tracking-wide text-muted-foreground min-[430px]:inline">HISTORY</span>
          </button>
          <button
            onClick={toggleSound}
            className="rounded-lg p-2 transition-colors hover:bg-secondary sm:p-2.5"
            aria-label={soundOn ? "Mute notification sounds" : "Enable notification sounds"}
            title={soundOn ? "Sounds on" : "Sounds off"}
          >
            {soundOn ? (
              <Volume2 className="w-5 h-5 text-muted-foreground" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => navigate("/account")}
            className="flex items-center gap-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-secondary sm:px-3"
            aria-label="Login"
            title="Login"
          >
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="hidden text-xs font-semibold tracking-wide text-muted-foreground min-[430px]:inline">LOGIN</span>
          </button>

          <button
            onClick={() => navigate("/admin")}
            className="rounded-lg p-2 transition-colors hover:bg-secondary sm:p-2.5"
            aria-label="Admin"
          >
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
