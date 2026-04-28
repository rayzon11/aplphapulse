export default function Loader({ count = 3, highlight = false }) {
  return (
    <div className={`grid gap-5 ${count > 3 ? "md:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-3"}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`loader-${index}`}
          className={`animate-pulse rounded-[28px] border p-5 ${
            highlight ? "border-accent/15 bg-accent/5" : "border-white/10 bg-white/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-white/10" />
            <div className="h-6 w-20 rounded-full bg-white/10" />
          </div>
          <div className="mt-6 h-5 w-28 rounded-full bg-white/10" />
          <div className="mt-3 h-9 w-40 rounded-full bg-white/10" />
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="h-16 rounded-2xl bg-white/10" />
            <div className="h-16 rounded-2xl bg-white/10" />
            <div className="col-span-2 h-16 rounded-2xl bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
