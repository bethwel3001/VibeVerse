export default function FeatureCard({ title, desc, icon }) {
  return (
    <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md p-6 rounded-2xl shadow-md flex gap-6 hover:scale-105 transition-transform h-full">
      <div className="w-14 h-14 rounded-lg flex items-center justify-center text-3xl bg-white/30 dark:bg-black/30">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-xl mb-2">{title}</h4>
        <p className="text-base opacity-80">{desc}</p>
      </div>
    </div>
  );
}