export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Your Habits</h1>
        <p className="text-gray-400 mt-1">Here&apos;s your plan for this week</p>
      </header>

      {/* Placeholder calendar / habit grid */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="text-center">
            <p className="text-xs text-gray-500 mb-2">{day}</p>
            <div className="h-16 rounded-lg bg-gray-800 border border-gray-700" />
          </div>
        ))}
      </div>

      {/* Placeholder habit list */}
      <div className="space-y-3">
        {["Morning run", "Read 20 pages", "Meditate"].map((habit) => (
          <div
            key={habit}
            className="flex items-center gap-4 p-4 rounded-xl bg-gray-900 border border-gray-800"
          >
            <div className="w-5 h-5 rounded-full border-2 border-[#FF6B6B]" />
            <span className="text-gray-200">{habit}</span>
          </div>
        ))}
      </div>

      {/* AI Coach CTA */}
      <button className="mt-8 px-6 py-3 rounded-xl bg-[#FF6B6B] text-white font-semibold hover:bg-[#e55a5a] transition-colors">
        Talk to AI Coach
      </button>
    </div>
  );
}
