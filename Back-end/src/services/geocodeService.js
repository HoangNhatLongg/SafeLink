/**
 * Reverse geocoding qua OpenStreetMap Nominatim (miễn phí).
 * Chính sách: https://operations.osmfoundation.org/policies/nominatim/ — tối đa ~1 req/giây.
 * Đặt NOMINATIM_USER_AGENT trong .env (email hoặc URL dự án) nếu triển khai production.
 */

const DEFAULT_UA =
  process.env.NOMINATIM_USER_AGENT ||
  "SafeLink/1.0 (university project; contact: not-configured)";

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>}
 */
export async function reverseGeocodeLabel(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "vi,en");

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": DEFAULT_UA,
        Accept: "application/json",
      },
    });
    clearTimeout(tid);
    if (!res.ok) return null;
    const data = await res.json();
    return formatNominatimLine(data);
  } catch (err) {
    clearTimeout(tid);
    console.warn("reverseGeocodeLabel:", err.message);
    return null;
  }
}

function formatNominatimLine(data) {
  const a = data?.address || {};
  const state = (a.state || "").trim();
  const city = (
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    ""
  ).trim();
  const district = (a.county || a.city_district || a.suburb || a.quarter || "").trim();

  const parts = [];
  if (district && district !== city) parts.push(district);
  if (city) parts.push(city);
  if (state && !parts.includes(state)) parts.push(state);

  if (parts.length) return parts.join(", ");

  if (typeof data.display_name === "string" && data.display_name.trim()) {
    return data.display_name
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(", ");
  }
  return null;
}
