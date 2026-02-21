import { motion } from 'framer-motion'

export default function StrikeIndicator({ strikes = 0, maxStrikes = 3 }) {
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: maxStrikes }, (_, i) => {
        const isFilled = i < strikes
        return (
          <motion.div
            key={i}
            className={[
              'w-3 h-3 rounded-full border',
              isFilled
                ? 'bg-signal-red border-signal-red'
                : 'border-chrome-subtle/50 bg-transparent',
            ].join(' ')}
            animate={
              isFilled
                ? { scale: [1, 1.3, 1], x: [0, -2, 2, -1, 0] }
                : {}
            }
            transition={{ duration: 0.3 }}
          />
        )
      })}
    </div>
  )
}
