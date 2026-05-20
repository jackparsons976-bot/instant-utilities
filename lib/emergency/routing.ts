export interface Position {
  x_percent: number
  y_percent: number
}

export interface RouteNode extends Position {
  id: string
  label: string
  node_type: string
}

export interface HazardPosition extends Position {
  id: string
}

export interface EvacuationRoute {
  waypoints: RouteNode[]
  blocked: boolean
  message: string | null
}

const HAZARD_EXCLUSION_RADIUS = 5 // percent units

function distance(a: Position, b: Position): number {
  const dx = a.x_percent - b.x_percent
  const dy = a.y_percent - b.y_percent
  return Math.sqrt(dx * dx + dy * dy)
}

function isBlocked(node: Position, hazards: HazardPosition[]): boolean {
  return hazards.some(h => distance(node, h) < HAZARD_EXCLUSION_RADIUS)
}

export function calculateEvacuationRoute(
  userPosition: Position,
  nodes: RouteNode[],
  hazardMarkers: HazardPosition[]
): EvacuationRoute {
  // Filter to exit and emergency point nodes
  const exitTypes = ['exit', 'emergency_exit', 'emergency_point', 'assembly_point', 'stairwell']
  const exits = nodes.filter(n => exitTypes.includes(n.node_type.toLowerCase()))

  if (exits.length === 0) {
    return { waypoints: [], blocked: false, message: 'No exit nodes found on this floor' }
  }

  // Remove nodes blocked by hazards
  const unblocked = exits.filter(n => !isBlocked(n, hazardMarkers))

  if (unblocked.length === 0) {
    // All exits blocked — return nearest exit anyway with warning
    const nearest = exits.sort((a, b) => distance(userPosition, a) - distance(userPosition, b))[0]
    return {
      waypoints: [nearest],
      blocked: true,
      message: 'Warning: nearest exits may be blocked. Use caution.',
    }
  }

  // Find nearest unblocked exit
  const nearest = unblocked.sort((a, b) => distance(userPosition, a) - distance(userPosition, b))[0]

  // Look for corridor/waypoint nodes to route through
  const corridorTypes = ['corridor', 'hallway', 'junction', 'landing']
  const corridors = nodes
    .filter(n => corridorTypes.includes(n.node_type.toLowerCase()))
    .filter(n => !isBlocked(n, hazardMarkers))

  // Simple routing: find corridor nodes between user and exit
  const waypoints: RouteNode[] = []
  const directDist = distance(userPosition, nearest)

  for (const c of corridors) {
    const viaCorridorDist = distance(userPosition, c) + distance(c, nearest)
    // Only include corridor if it meaningfully routes toward the exit
    if (viaCorridorDist < directDist * 1.4) {
      waypoints.push(c)
    }
  }

  // Sort corridor waypoints by distance from user
  waypoints.sort((a, b) => distance(userPosition, a) - distance(userPosition, b))

  return {
    waypoints: [...waypoints, nearest],
    blocked: false,
    message: null,
  }
}

export function buildDirectionText(waypoints: RouteNode[]): string[] {
  if (waypoints.length === 0) return ['Head to the nearest exit immediately.']
  if (waypoints.length === 1) return [`Proceed to ${waypoints[0].label}.`]

  return waypoints.map((w, i) => {
    if (i === 0) return `Head toward ${w.label}`
    if (i === waypoints.length - 1) return `Exit via ${w.label}`
    return `Continue through ${w.label}`
  })
}
