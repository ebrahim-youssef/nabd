// A device location fix. Coordinates are a device-local value on both targets: they are never
// synced, and the SPA never sends them anywhere. Reverse geocoding — the one path that hands a
// deliberately coarsened pair to a third party — belongs to the native countdown notification and
// arrives with it.
export type Coords = { latitude: number; longitude: number }

// Why a location request came back empty. The three reasons stay distinct because they need
// different actions from the user (NBD-48): `services-disabled` is the phone's own GPS toggle,
// `denied` is the application permission, and `unavailable` is environmental and worth retrying.
// The browser can only ever produce the last two — it has no view of the device GPS switch — but
// the type is shared so native and the SPA describe the same failure the same way.
export type LocationFailure = 'services-disabled' | 'denied' | 'unavailable'

export type LocationRequest = { ok: true; coords: Coords } | { ok: false; reason: LocationFailure }
