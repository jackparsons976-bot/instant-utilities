export type Permission =
  | 'SEE_ALL_LOCATIONS'
  | 'DISPATCH_RESPONDER'
  | 'RESOLVE_HAZARD'
  | 'MANAGE_RESIDENTS'
  | 'VIEW_ANALYTICS'
  | 'INVITE_RESIDENTS'
  | 'MANAGE_VENDORS'
  | 'ACCESS_ADMIN'
  | 'TRIGGER_SOS'
  | 'ADD_HAZARD_MARKER'
  | 'MANAGE_FLOOR_PLANS'
  | 'VIEW_RESPONDER_PANEL'
  | 'UPDATE_INCIDENT_STATUS'
  | 'MANAGE_MARKETPLACE'

type Claims = Record<string, any> | null

function role(claims: Claims): string {
  return claims?.app_metadata?.platform_role ?? claims?.platform_role ?? 'resident'
}

function caps(claims: Claims): string[] {
  return claims?.app_metadata?.caps ?? claims?.caps ?? []
}

const PLATFORM_ADMIN = 'platform_admin'
const FACILITY_MANAGER = 'facility_manager'
const RESIDENT = 'resident'

export function can(claims: Claims, action: Permission): boolean {
  const r = role(claims)
  const c = caps(claims)

  switch (action) {
    case 'SEE_ALL_LOCATIONS':
    case 'DISPATCH_RESPONDER':
    case 'RESOLVE_HAZARD':
    case 'MANAGE_RESIDENTS':
    case 'INVITE_RESIDENTS':
    case 'VIEW_RESPONDER_PANEL':
    case 'UPDATE_INCIDENT_STATUS':
      return r === PLATFORM_ADMIN || r === FACILITY_MANAGER

    case 'VIEW_ANALYTICS':
    case 'MANAGE_VENDORS':
    case 'MANAGE_FLOOR_PLANS':
      return r === PLATFORM_ADMIN || r === FACILITY_MANAGER

    case 'ACCESS_ADMIN':
      return r === PLATFORM_ADMIN

    case 'TRIGGER_SOS':
      // residents can trigger; household members only if flag set (checked externally)
      return r === PLATFORM_ADMIN || r === FACILITY_MANAGER || r === RESIDENT

    case 'ADD_HAZARD_MARKER':
      return r === PLATFORM_ADMIN || r === FACILITY_MANAGER || r === RESIDENT

    case 'MANAGE_MARKETPLACE':
      return r === PLATFORM_ADMIN || r === FACILITY_MANAGER || c.includes('marketplace:vendor')

    default:
      return false
  }
}
