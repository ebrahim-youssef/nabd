const ARC_INSET = 23
const ARC_BOTTOM_INSET = 12
const ARC_TOP_INSET = 28

export type HeroPathGeometry = {
  restPath: string
  travelledPath: string
  pointAt: (progress: number) => { x: number; y: number }
}

export function heroPathGeometry(
  width: number,
  height: number,
  progress: number,
): HeroPathGeometry {
  const centerX = width / 2
  const centerY = height - ARC_BOTTOM_INSET
  const radiusX = width / 2 - ARC_INSET
  const radiusY = height - ARC_TOP_INSET
  const pointAt = (value: number) => {
    const angle = Math.PI * Math.max(0, Math.min(1, value))
    return {
      x: centerX + radiusX * Math.cos(angle),
      y: centerY - radiusY * Math.sin(angle),
    }
  }
  const start = pointAt(0)
  const end = pointAt(1)
  const travelled = pointAt(progress)
  const arc = (point: { x: number; y: number }) =>
    `A ${radiusX} ${radiusY} 0 0 0 ${point.x.toFixed(1)} ${point.y.toFixed(1)}`

  return {
    restPath: `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} ${arc(end)}`,
    travelledPath:
      progress <= 0 ? '' : `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} ${arc(travelled)}`,
    pointAt,
  }
}
