import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export async function requestLocationPermission() {
  if (Capacitor.isNativePlatform()) {
    return Geolocation.requestPermissions();
  }
  return null;
}

export async function getCurrentLocation() {
  if (Capacitor.isNativePlatform()) {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 15000
    });
    return normalizePosition(position);
  }

  if (!navigator.geolocation) {
    throw new Error('Geolocalizzazione non disponibile su questo dispositivo.');
  }

  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 15000
    });
  });
  return normalizePosition(position);
}

export async function watchLiveLocation({ onLocation, onError } = {}) {
  if (Capacitor.isNativePlatform()) {
    const id = await Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000
    }, (position, error) => {
      if (error) { onError?.(error); return; }
      if (!position) return;
      onLocation?.(normalizePosition(position));
    });
    return async () => {
      try { await Geolocation.clearWatch({ id }); } catch { /* noop */ }
    };
  }

  if (!navigator.geolocation) throw new Error('Geolocalizzazione non disponibile su questo dispositivo.');
  const id = navigator.geolocation.watchPosition(
    (position) => onLocation?.(normalizePosition(position)),
    (error) => onError?.(error),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );
  return async () => navigator.geolocation.clearWatch(id);
}

function normalizePosition(position) {
  const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
  return makeLocation(latitude, longitude, accuracy, { altitude, speed, heading });
}

function makeLocation(latitude, longitude, accuracy, extra = {}) {
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
    altitude: Number.isFinite(extra.altitude) ? extra.altitude : null,
    speed: Number.isFinite(extra.speed) ? extra.speed : null,
    heading: Number.isFinite(extra.heading) ? extra.heading : null,
    mapsUrl: `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`,
    capturedAt: new Date().toISOString()
  };
}
