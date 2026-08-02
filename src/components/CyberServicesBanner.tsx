import { FileText, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const CyberServicesBanner = () => (
  <div className="px-4">
    <Link
      to="/cyber"
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-all hover:border-primary/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
        <FileText className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[13px] font-bold text-foreground leading-tight">
          Cyber Services
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
          Good conduct, passports, KRA, NTSA, TSC, CVs & more
        </p>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
    </Link>
  </div>
);

export default CyberServicesBanner;
