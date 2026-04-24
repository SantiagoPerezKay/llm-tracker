const TOPIC_COLORS = [
  'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
]

export default function TopicCloud({ topics = [], max = 20 }) {
  if (!topics.length) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 italic">Sin temas detectados</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {topics.slice(0, max).map((topic, i) => (
        <span
          key={i}
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${TOPIC_COLORS[i % TOPIC_COLORS.length]}`}
        >
          {topic}
        </span>
      ))}
    </div>
  )
}
