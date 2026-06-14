/** Resolve the browser's current GPS coordinates as a Google Maps link. */
export function getCurrentLocationUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location isn't supported on this device/browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        resolve(`https://maps.google.com/?q=${latitude},${longitude}`);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location permission denied. You can skip this step."));
        } else {
          reject(new Error("Couldn't get your location. You can skip this step."));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}
