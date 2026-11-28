import React, { useState, useEffect } from "react";
import {
  Navigation,
  Search,
  Check,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PRESET_LOCATIONS } from "@/data";

export { PRESET_LOCATIONS };

export function GymLocationPicker({
  address = "",
  city = "",
  latitude = "",
  longitude = "",
  onChange,
}) {
  const [currentAddress, setCurrentAddress] = useState(address || "");
  const [currentCity, setCurrentCity] = useState(city || "");
  const [lat, setLat] = useState(latitude !== undefined && latitude !== null && latitude !== "" ? Number(latitude) : "");
  const [lng, setLng] = useState(longitude !== undefined && longitude !== null && longitude !== "" ? Number(longitude) : "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (address !== undefined) setCurrentAddress(address);
  }, [address]);

  useEffect(() => {
    if (city !== undefined) setCurrentCity(city);
  }, [city]);

  useEffect(() => {
    if (latitude !== undefined && latitude !== null && latitude !== "") {
      setLat(Number(latitude));
    } else if (latitude === "" || latitude === null) {
      setLat("");
    }
  }, [latitude]);

  useEffect(() => {
    if (longitude !== undefined && longitude !== null && longitude !== "") {
      setLng(Number(longitude));
    } else if (longitude === "" || longitude === null) {
      setLng("");
    }
  }, [longitude]);

  const updateLocation = (newAddr, newCity, newLat, newLng) => {
    setCurrentAddress(newAddr);
    setCurrentCity(newCity);
    setLat(newLat);
    setLng(newLng);
    onChange?.({
      address: newAddr,
      city: newCity,
      latitude: newLat !== "" && newLat !== null ? Number(newLat) : null,
      longitude: newLng !== "" && newLng !== null ? Number(newLng) : null,
    });
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setSearching(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      if (res.ok) {
        const list = await res.json();
        if (list && list.length > 0) {
          const item = list[0];
          const newLat = Number(parseFloat(item.lat).toFixed(5));
          const newLng = Number(parseFloat(item.lon).toFixed(5));
          const addr = item.address || {};
          const detectedCity = addr.city || addr.town || addr.county || addr.state || currentCity;
          updateLocation(item.display_name, detectedCity, newLat, newLng);
          setSearching(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Search geocode failed:", err);
    }

    setSearching(false);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setGeoLoading(true);

    const onSuccess = async (pos) => {
      const userLat = Number(pos.coords.latitude.toFixed(5));
      const userLng = Number(pos.coords.longitude.toFixed(5));
      let detectedAddress = currentAddress || "";
      let detectedCity = currentCity || "";

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        );
        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          detectedCity = addr.city || addr.town || addr.county || addr.state_district || addr.state || detectedCity;
          detectedAddress = data.display_name || `${userLat}, ${userLng}`;
        }
      } catch (e) {
        console.warn("Reverse geocode failed:", e);
      }

      updateLocation(detectedAddress, detectedCity, userLat, userLng);
      setGeoLoading(false);
    };

    const onFinalError = (err) => {
      console.warn("Geolocation error:", err);
      setGeoLoading(false);
      if (err?.code === err?.PERMISSION_DENIED) {
        alert("Location permission was denied. Please allow location access in your browser settings or search your address manually.");
      } else {
        alert("Could not fetch device location. Please search your address or click on the map.");
      }
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        // High-accuracy GPS often times out or is unavailable on desktop browsers; retry with network/IP location.
        if (err?.code !== err?.PERMISSION_DENIED) {
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            onFinalError,
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          );
          return;
        }
        onFinalError(err);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleConfirmLocation = () => {
    setConfirmed(true);
    onChange?.({
      address: currentAddress,
      city: currentCity,
      latitude: lat !== "" && lat !== null ? Number(lat) : null,
      longitude: lng !== "" && lng !== null ? Number(lng) : null,
    });
    setTimeout(() => setConfirmed(false), 2000);
  };

  const hasCoords = lat !== "" && lng !== "" && !isNaN(Number(lat)) && !isNaN(Number(lng));
  const osmUrl = hasCoords ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}` : null;
  const osmEmbedUrl = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(Number(lng) - 0.008).toFixed(4)}%2C${(Number(lat) - 0.005).toFixed(4)}%2C${(Number(lng) + 0.008).toFixed(4)}%2C${(Number(lat) + 0.005).toFixed(4)}&layer=mapnik&marker=${lat}%2C${lng}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=68.1%2C6.7%2C97.4%2C35.7&layer=mapnik`;

  return (
    <div className="space-y-4">
      {/* Search Bar - Full Width on Mobile */}
      <div>
        <Label htmlFor="gym-location-picker-search-location" className="text-xs font-semibold text-foreground">Search Location</Label>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mt-1.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input id="gym-location-picker-search-location" name="searchQuery"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area, landmark, commercial plaza..."
              className="pl-9 text-xs sm:text-sm rounded-xl h-11"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={searching}
              variant="outline"
              className="flex-1 sm:flex-none rounded-xl border-border px-4 text-xs font-semibold h-11"
            >
              {searching ? "Searching..." : "Search"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleUseCurrentLocation}
              disabled={geoLoading}
              className="flex-1 sm:flex-none rounded-xl border-border px-3 text-xs font-semibold gap-1 text-primary hover:bg-primary/10 h-11"
              title="Use device GPS"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Current GPS</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Suggested Quick Locations */}
      {PRESET_LOCATIONS && PRESET_LOCATIONS.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] text-muted-foreground shrink-0 font-medium">Presets:</span>
          {PRESET_LOCATIONS.map((loc) => (
            <button
              key={loc.name}
              type="button"
              onClick={() => {
                setLat(loc.lat);
                setLng(loc.lng);
                setCurrentAddress(loc.name);
                setCurrentCity(loc.city);
              }}
              className="text-[11px] bg-secondary hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-full whitespace-nowrap transition-colors border border-border/60 shrink-0 font-medium"
            >
              {loc.name.split(",")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Interactive OpenStreetMap Preview with Pin Marker */}
      <div className="relative w-full h-60 rounded-2xl overflow-hidden border border-border shadow-inner bg-slate-100 touch-manipulation">
        <iframe
          key={`${lat}-${lng}`}
          title="OpenStreetMap Picker"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src={osmEmbedUrl}
          className="w-full h-full border-0 rounded-2xl"
        />

        {/* Top Badges: OpenStreetMap label and Open external link */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-card/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border text-[10px] text-foreground font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>OpenStreetMap</span>
        </div>

        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-card/95 hover:bg-card text-[11px] font-semibold text-primary px-2.5 py-1 rounded-lg border border-border shadow-xs transition-colors"
        >
          <span>Open in OSM</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        {/* Bottom Coordinates badge */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-card/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border text-[10px] text-foreground font-mono shadow-xs">
          <span className="text-primary font-bold">●</span>
          <span>Lat: {lat || "Not set"}</span>
          <span>|</span>
          <span>Lng: {lng || "Not set"}</span>
        </div>
      </div>

      {/* Editable Address Details */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="gym-location-picker-selected-address" className="text-xs text-muted-foreground font-medium">Selected Address</Label>
          <Input id="gym-location-picker-selected-address" name="currentAddress"
            autoComplete="street-address"
            value={currentAddress}
            onChange={(e) => {
              const val = e.target.value;
              setCurrentAddress(val);
              onChange?.({ address: val, city: currentCity, latitude: lat !== "" && lat !== null ? Number(lat) : null, longitude: lng !== "" && lng !== null ? Number(lng) : null });
            }}
            placeholder="Street / Area / Building"
            className="mt-1 text-xs sm:text-sm rounded-xl h-11"
          />
        </div>
        <div>
          <Label htmlFor="gym-location-picker-city-state" className="text-xs text-muted-foreground font-medium">City & State</Label>
          <Input id="gym-location-picker-city-state" name="currentCity"
            autoComplete="off"
            value={currentCity}
            onChange={(e) => {
              const val = e.target.value;
              setCurrentCity(val);
              onChange?.({ address: currentAddress, city: val, latitude: lat !== "" && lat !== null ? Number(lat) : null, longitude: lng !== "" && lng !== null ? Number(lng) : null });
            }}
            placeholder="City, State"
            className="mt-1 text-xs sm:text-sm rounded-xl h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="gym-location-picker-latitude" className="text-xs text-muted-foreground font-medium">Latitude</Label>
          <Input id="gym-location-picker-latitude" name="lat"
            autoComplete="off"
            type="number"
            step="any"
            value={lat ?? ""}
            placeholder="e.g. 9.9312"
            onChange={(e) => {
              const val = e.target.value;
              setLat(val);
              onChange?.({ address: currentAddress, city: currentCity, latitude: val !== "" ? Number(val) : null, longitude: lng !== "" && lng !== null ? Number(lng) : null });
            }}
            className="mt-1 text-xs font-mono rounded-xl h-10"
          />
        </div>
        <div>
          <Label htmlFor="gym-location-picker-longitude" className="text-xs text-muted-foreground font-medium">Longitude</Label>
          <Input id="gym-location-picker-longitude" name="lng"
            autoComplete="off"
            type="number"
            step="any"
            value={lng ?? ""}
            placeholder="e.g. 76.2673"
            onChange={(e) => {
              const val = e.target.value;
              setLng(val);
              onChange?.({ address: currentAddress, city: currentCity, latitude: lat !== "" && lat !== null ? Number(lat) : null, longitude: val !== "" ? Number(val) : null });
            }}
            className="mt-1 text-xs font-mono rounded-xl h-10"
          />
        </div>
      </div>

      {/* Confirm Button */}
      <Button
        type="button"
        onClick={handleConfirmLocation}
        className={`w-full rounded-xl h-12 text-sm font-bold transition-all ${
          confirmed
            ? "bg-green-600 text-white"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {confirmed ? (
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Location Confirmed & Linked
          </span>
        ) : (
          "Confirm Location"
        )}
      </Button>
    </div>
  );
}

export default GymLocationPicker;
