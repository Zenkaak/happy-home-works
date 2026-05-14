import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface SmsLog {
  id: string;
  phone_number: string;
  message: string;
  status: string;
  retry_count: number;
  created_at: string;
  transaction_id: string | null;
  batch_id: string | null;
}

const getAdminToken = () => localStorage.getItem("dasnet_admin_token");

const AdminSmsLogs = () => {
  const { data: smsLogs, isLoading, refetch } = useQuery({
    queryKey: ["admin-sms-logs"],
    queryFn: async () => {
      const token = getAdminToken();
      if (!token) return [];
      const { data, error } = await supabase.functions.invoke("admin-api", {
        body: { action: "get_sms_logs" },
        headers: { "x-admin-token": token },
      });
      if (error) throw error;
      return (data?.logs ?? []) as SmsLog[];
    },
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "sent": return <CheckCircle className="w-3.5 h-3.5 text-primary" />;
      case "failed": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      default: return <Clock className="w-3.5 h-3.5 text-warning" />;
    }
  };

  const sentCount = smsLogs?.filter(s => s.status === "sent").length || 0;
  const failedCount = smsLogs?.filter(s => s.status === "failed").length || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="gradient-card rounded-xl p-3 text-center">
          <p className="text-lg font-bold">{smsLogs?.length || 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
        </div>
        <div className="gradient-card rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-primary">{sentCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Delivered</p>
        </div>
        <div className="gradient-card rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-destructive">{failedCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Failed</p>
        </div>
      </div>

      <button
        onClick={() => refetch()}
        className="w-full py-2 rounded-lg bg-secondary text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors"
      >
        <RefreshCw className="w-4 h-4" /> Refresh Logs
      </button>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading SMS logs...</div>
      ) : smsLogs?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">No SMS logs found</div>
      ) : (
        <div className="space-y-2">
          {smsLogs?.map((log) => (
            <div key={log.id} className="gradient-card rounded-xl p-3">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {statusIcon(log.status)}
                  <span className="text-sm font-medium">{log.phone_number}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(log.created_at), "MMM d, HH:mm")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">{log.message}</p>
              {log.batch_id && (
                <span className="text-[10px] text-primary font-mono mt-1 inline-block">Batch: {log.batch_id.slice(0, 16)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSmsLogs;
