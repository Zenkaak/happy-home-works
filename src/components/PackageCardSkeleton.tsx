const PackageCardSkeleton = () => (
  <div className="gradient-card rounded-xl p-2.5 animate-pulse">
    <div className="flex items-center gap-2 mb-1.5">
      <div className="w-6 h-6 rounded-lg bg-secondary/60 shrink-0" />
      <div className="h-3 bg-secondary/60 rounded flex-1" />
    </div>
    <div className="flex items-center justify-between">
      <div className="h-4 w-12 bg-secondary/60 rounded" />
      <div className="h-2 w-10 bg-secondary/40 rounded" />
    </div>
  </div>
);

export default PackageCardSkeleton;
