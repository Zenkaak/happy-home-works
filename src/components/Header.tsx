import { Clock, User, ShieldCheck, Volume2, VolumeX } from "lucide-react";
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
    <header className="sticky top-0 z-50 glass px-4 py-3">
      <div className="container flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 group"
          aria-label="DASNET home"
        >
          <div className="relative w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background animate-pulse" aria-hidden />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-display text-lg font-bold tracking-tight leading-none">
              DAS<span className="text-primary">NET</span>
            </span>
            <span className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase leading-none mt-0.5">
              Dasnet Ventures
            </span>
          </div>
        </button>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => navigate("/history")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wide">HISTORY</span>
          </button>
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-lg hover:bg-secondary transition-colors"
            aria-label={soundOn ? "Mute notification sounds" : "Enable notification sounds"}
            title={soundOn ? "Sounds on" : "Sounds off"}
          >
            {soundOn ? (
              <Volume2 className="w-5 h-5 text-muted-foreground" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
