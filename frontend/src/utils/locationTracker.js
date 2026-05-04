// Location tracker utility for live GPS tracking (Guardian side)
// Uses setInterval + navigator.geolocation to post coordinates every 30 seconds

let intervalId = null;

/**
 * Start tracking the device's GPS position for a given case.
 * If already tracking, the previous tracker is stopped first.
 *
 * @param {string} caseId - The case ID to associate coordinates with
 * @param {function} onCoord - Callback invoked with { lat, lng, caseId } on each successful fix
 */
export function startTracking(caseId, onCoord) {
  // Stop any existing tracker before starting a new one
  if (intervalId !== null) {
    stopTracking();
  }

  intervalId = setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onCoord({ lat, lng, caseId });
      },
      (error) => {
        console.error('Location tracking error:', error);
        // Wait for the next interval tick — do not stop tracking
      }
    );
  }, 30000);
}

/**
 * Stop the active location tracker and clear the interval.
 */
export function stopTracking() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
