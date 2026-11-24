import { HEALTH_BUCKET_META, type ActiveHealthBucket } from '@/lib/healthBucket'
import { cn } from '@/lib/utils'

/** Estado de salud con el nombre y los colores vigentes de toda la app (lib/healthBucket.ts). */
export function BucketChip({ bucket }: { bucket: ActiveHealthBucket }) {
  const meta = HEALTH_BUCKET_META[bucket]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold',
        meta.badgeClassName
      )}
    >
      {meta.label}
    </span>
  )
}
