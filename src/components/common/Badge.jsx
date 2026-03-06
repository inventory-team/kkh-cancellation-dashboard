import clsx from 'clsx'

const TIER_STYLES = {
  HIGH:    'bg-red-100 text-red-700 border border-red-200',
  MEDIUM:  'bg-amber-100 text-amber-700 border border-amber-200',
  LOW:     'bg-green-100 text-green-700 border border-green-200',
  CRITICAL:'bg-red-600 text-white',
  INFO:    'bg-blue-100 text-blue-700 border border-blue-200',
}

export default function Badge({ label, tier = 'INFO', className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
        TIER_STYLES[tier] ?? TIER_STYLES.INFO,
        className
      )}
    >
      {label}
    </span>
  )
}
