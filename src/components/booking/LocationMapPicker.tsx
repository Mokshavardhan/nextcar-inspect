"use client";

import React, { useEffect, useRef, useState } from "react";
import { Crosshair, MapPin, Search } from "lucide-react";

interface LocationValue {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
}

export function LocationMapPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [mapHint, setMapHint] = useState("Click anywhere on the map to pin inspection location");

  const lat = value.latitude ?? 12.9716;
  const lng = value.longitude ?? 77.5946;

  useEffect(() => {
    let active = true;
    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;
      const L = (await import("leaflet")).default;
      if (!active || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 12,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "custom-nextcar-pin",
        html: `<div style="width:28px;height:28px;border-radius:9999px;background:#2563EB;border:3px solid #FFFFFF;box-shadow:0 4px 10px rgba(16,27,53,0.4);"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);

      const handlePinMove = async (nextLat: number, nextLng: number) => {
        const roundedLat = Math.round(nextLat * 100000) / 100000;
        const roundedLng = Math.round(nextLng * 100000) / 100000;
        onChange({
          ...value,
          latitude: roundedLat,
          longitude: roundedLng,
        });
        setMapHint(`Pinned at ${roundedLat}, ${roundedLng}`);

        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${roundedLat}&lon=${roundedLng}`
          );
          if (resp.ok) {
            const geo = await resp.json();
            const addr = geo.address || {};
            const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
            onChange({
              address: street || geo.display_name?.split(",")[0] || value.address,
              city: addr.city || addr.town || addr.village || value.city,
              state: addr.state || value.state,
              postalCode: addr.postcode || value.postalCode,
              latitude: roundedLat,
              longitude: roundedLng,
            });
          }
        } catch {
          // Offline or throttled: retain user manual address with coordinates updated
        }
      };

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(e.latlng);
        handlePinMove(e.latlng.lat, e.latlng.lng);
      });

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        handlePinMove(pos.lat, pos.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    initMap();
    return () => {
      active = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && value.latitude && value.longitude) {
      markerRef.current.setLatLng([value.latitude, value.longitude]);
    }
  }, [value.latitude, value.longitude]);

  const handleGeocodeSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      if (resp.ok) {
        const rows = await resp.json();
        if (rows[0]) {
          const hit = rows[0];
          const nextLat = Math.round(Number(hit.lat) * 100000) / 100000;
          const nextLng = Math.round(Number(hit.lon) * 100000) / 100000;
          const addr = hit.address || {};
          const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
          onChange({
            address: street || hit.display_name?.split(",")[0] || value.address,
            city: addr.city || addr.town || addr.village || value.city,
            state: addr.state || value.state,
            postalCode: addr.postcode || value.postalCode,
            latitude: nextLat,
            longitude: nextLng,
          });
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([nextLat, nextLng], 15);
            markerRef.current.setLatLng([nextLat, nextLng]);
          }
          setMapHint(`Located: ${hit.display_name}`);
        } else {
          setMapHint("No matching location found — you can enter address fields directly below.");
        }
      }
    } catch {
      setMapHint("Map search offline — please enter address details manually below.");
    } finally {
      setSearching(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setMapHint("Browser geolocation is not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = Math.round(pos.coords.latitude * 100000) / 100000;
        const nextLng = Math.round(pos.coords.longitude * 100000) / 100000;
        onChange({ ...value, latitude: nextLat, longitude: nextLng });
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([nextLat, nextLng], 15);
          markerRef.current.setLatLng([nextLat, nextLng]);
        }
        setMapHint(`Current GPS pinned (${nextLat}, ${nextLng})`);
      },
      () => {
        setMapHint("Location permission declined. Click map or enter address below.");
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleGeocodeSearch();
              }
            }}
            placeholder="Search street, landmark, or zip code on map..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-[#172033] focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleGeocodeSearch}
          disabled={searching}
          className="rounded-lg bg-[#101B35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {searching ? "Finding..." : "Find on Map"}
        </button>
        <button
          type="button"
          onClick={handleDetectLocation}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#101B35] hover:bg-slate-50"
        >
          <Crosshair className="h-4 w-4 text-[#2563EB]" />
          Use My Location
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <div ref={mapContainerRef} className="h-64 w-full" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-[#2563EB]" />
          {mapHint}
        </span>
        {value.latitude !== null && value.longitude !== null && (
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
            Lat: {value.latitude.toFixed(4)}, Lng: {value.longitude.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}

