import {
  Footprints,
  Truck,
  Zap,
  PackageOpen,
  FlaskConical,
  CloudRain,
  Shovel,
  HeartPulse,
  Factory,
  PersonStanding,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  Footprints,
  Truck,
  Zap,
  PackageOpen,
  FlaskConical,
  CloudRain,
  Shovel,
  HeartPulse,
  Factory,
  PersonStanding,
}

export function HazardIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? TriangleAlert
  return <Icon className={className} />
}
