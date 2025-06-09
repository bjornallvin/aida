import React from "react";
import { DeviceFiltersProps } from "./types";

export const DeviceFilters: React.FC<DeviceFiltersProps> = ({
  searchTerm,
  selectedRoom,
  selectedType,
  devices,
  onSearchChange,
  onRoomChange,
  onTypeChange,
}) => {
  const deviceTypes = [...new Set(devices.map((d) => d.type))];
  const rooms = [...new Set(devices.map((d) => d.name.split("_")[0]))];

  return (
    <div
      style={{
        backgroundColor: "#f5f5f5",
        padding: "1rem",
        borderRadius: "8px",
        marginBottom: "1rem",
      }}
    >
      <h3 style={{ marginBottom: "1rem" }}>Filters</h3>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <label htmlFor="search" style={{ fontWeight: "bold" }}>
            Search devices:
          </label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by device name..."
            style={{
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "1rem",
              minWidth: "200px",
            }}
          />
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <label htmlFor="room-filter" style={{ fontWeight: "bold" }}>
            Filter by room:
          </label>
          <select
            id="room-filter"
            value={selectedRoom}
            onChange={(e) => onRoomChange(e.target.value)}
            style={{
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "1rem",
              minWidth: "150px",
            }}
          >
            <option value="">All rooms</option>
            {rooms.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <label htmlFor="type-filter" style={{ fontWeight: "bold" }}>
            Filter by type:
          </label>
          <select
            id="type-filter"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            style={{
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "1rem",
              minWidth: "150px",
            }}
          >
            <option value="">All types</option>
            {deviceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
