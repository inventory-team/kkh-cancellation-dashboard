import clsx from 'clsx'

export default function KPICard({ title, value, subtext, trend, icon, accentClass = 'bg-brand-600' }) {
  const trendPositive = trend > 0
  const trendNeutral  = trend === 0 || trend == null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {icon && (
          <span className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm', accentClass)}>
            {icon}
          </span>
        )}
      </div>

      <div>
        <div className="text-2xl font-bold text-gray-900 leading-tight">{value}</div>
        {subtext && <div className="text-xs text-gray-400 mt-0.5">{subtext}</div>}
      </div>

      {trend != null && (
        <div className={clsx(
          'flex items-center gap-1 text-xs font-medium',
          trendNeutral ? 'text-gray-400' : trendPositive ? 'text-red-500' : 'text-green-600'
        )}>
          {!trendNeutral && (
            <span>{trendPositive ? '▲' : '▼'}</span>
          )}
          <span>
            {trendNeutral
              ? 'No change'
              : `${Math.abs(trend).toFixed(1)}% vs last period`}
          </span>
        </div>
      )}
    </div>
  )
}
