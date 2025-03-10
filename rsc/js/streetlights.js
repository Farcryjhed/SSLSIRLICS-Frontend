class StreetlightMap {
  constructor() {
    this.zoomLevels = {
      city: 11,
      municipality: 14,
    };

    // Initialize properties
    this.provinceMarkers = null;
    this.municipalityMarkers = null;
    this.barangayMarkers = null;
    this.map = null;

    // Initialize GeoJSON layers
    this.geoJsonLayer = null;
    this.geoJsonLayers = {};
    this.activeRegions = new Set();

    // Start the initialization
    this.loadCoordinates();

    // Start periodic statistics updates
    this.updateStatistics();
    setInterval(() => this.updateStatistics(), 60000); // Update every minute
  }

  setupMap() {
    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    // Add zoom control to top right
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(this.map);
  }

  async loadCoordinates() {
    try {
      const response = await fetch("rsc/coordinates.json");
      this.coordinates = await response.json();

      // Initialize map after loading coordinates
      this.initializeMap();
    } catch (error) {
      console.error("Failed to load coordinates:", error);
    }
  }

  initializeMap() {
    // Find center point from coordinates
    const center = this.calculateMapCenter();

    // Create the map
    this.map = L.map("map", {
      zoomControl: false,
    }).setView([center.lat, center.long], 9);

    // Setup the map layers
    this.setupMap();

    // Create layer groups
    this.provinceMarkers = new L.LayerGroup().addTo(this.map);
    this.municipalityMarkers = new L.LayerGroup().addTo(this.map);
    this.barangayMarkers = new L.LayerGroup().addTo(this.map);
    this.geoJsonLayer = new L.LayerGroup().addTo(this.map); // Add GeoJSON layer group

    // Setup event handlers
    this.setupMouseCoordinates();
    this.map.on("zoomend", () => this.handleZoom());
    this.setupRegionControls(); // Add this line to initialize region controls

    // Add initial province markers
    this.addProvinceMarkers();
  }

  calculateMapCenter() {
    let totalLat = 0;
    let totalLong = 0;
    let count = 0;

    // Only include provinces with valid coordinates and data
    for (const province in this.coordinates) {
      const data = this.coordinates[province];
      if (
        data.lat &&
        data.long &&
        data.municipalities &&
        Object.keys(data.municipalities).length > 0
      ) {
        totalLat += data.lat;
        totalLong += data.long;
        count++;
      }
    }

    return {
      lat: count > 0 ? totalLat / count : 8.4542, // Default center if no valid provinces
      long: count > 0 ? totalLong / count : 124.6319,
    };
  }

  addProvinceMarkers() {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    for (const province in this.coordinates) {
      const data = this.coordinates[province];

      if (
        data.lat &&
        data.long &&
        data.municipalities &&
        Object.keys(data.municipalities).length > 0
      ) {
        const marker = L.marker([data.lat, data.long], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<i class="fas fa-building text-primary fa-3x"></i>',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
          }),
        });

        const popupContent = this.createProvincePopup({
          name: province,
          code: data.province_code,
        });

        if (isMobile) {
          // Mobile: Show popup on click and handle zoom button
          const popup = L.popup({
            closeButton: true,
            autoClose: false,
            closeOnClick: false,
            offset: [0, -20],
          }).setContent(popupContent);

          marker.bindPopup(popup);

          marker.on("popupopen", (e) => {
            const zoomButton =
              e.popup._contentNode.querySelector(".zoom-to-province");
            if (zoomButton) {
              zoomButton.addEventListener("click", () => {
                this.map.flyTo([data.lat, data.long], this.zoomLevels.city);
                this.showMunicipalityMarkers(province);
                marker.closePopup();
              });
            }
          });
        } else {
          // Desktop: Show popup on hover
          const popup = L.popup({
            closeButton: false,
            offset: [0, -20],
          }).setContent(popupContent);

          marker.on("mouseover", () => {
            marker.openPopup();
          });

          marker.on("mouseout", () => {
            marker.closePopup();
          });

          marker.on("click", () => {
            this.map.flyTo([data.lat, data.long], this.zoomLevels.city);
            this.showMunicipalityMarkers(province);
          });

          marker.bindPopup(popup);
        }

        this.provinceMarkers.addLayer(marker);
      }
    }
  }

  // Update the getMunicipalityCodes method
  async getMunicipalityCodes() {
    try {
      const data = await StreetlightQueries.getAllData();
      if (data.status === "success") {
        // Extract unique municipality codes from SOCIDs (first 3 characters)
        const codes = new Set();
        data.data.forEach((reading) => {
          // Check if reading has a valid SOCID before trying to split it
          if (reading && reading.SOCID && typeof reading.SOCID === "string") {
            const parts = reading.SOCID.split("-");
            if (parts.length > 0) {
              const municipalityCode = parts[0];
              codes.add(municipalityCode);
            }
          }
        });

        console.log("Found municipality codes:", Array.from(codes)); // Debug log
        return codes;
      }
      return new Set();
    } catch (error) {
      console.error("Failed to get municipality codes:", error);
      return new Set();
    }
  }

  // Add new method to check if municipality has streetlights
  async hasStreetlights(municipalityCode) {
    try {
      const data = await StreetlightQueries.getAllData();
      if (data.status === "success") {
        return data.data.some((reading) => {
          return (
            reading &&
            reading.SOCID &&
            reading.SOCID.startsWith(municipalityCode)
          );
        });
      }
      return false;
    } catch (error) {
      console.error(
        `Error checking streetlights for ${municipalityCode}:`,
        error
      );
      return false;
    }
  }

  // Update getBarangayCode method to handle lowercase socid
  getBarangayCode(socid) {
    if (!socid || typeof socid !== "string") {
      console.log(`Invalid SOCID: ${socid}`);
      return null;
    }

    const parts = socid.split("-");
    if (parts.length !== 2) {
      console.log(`Invalid SOCID format: ${socid} (expected format: XXX-YYYY)`);
      return null;
    }

    const barangayCode = parts[1].substring(0, 3);
    console.log(`SOCID: ${socid} -> Barangay Code: ${barangayCode}`);
    return barangayCode;
  }

  // Add new method to get streetlight count for a barangay
  async getBarangayStreetlightCount(barangayCode) {
    try {
      const data = await StreetlightQueries.getAllData();
      if (data.status === "success" && Array.isArray(data.data)) {
        return data.data.filter((reading) => {
          const parts = reading.socid?.split("-");
          return parts && parts[1] && parts[1].startsWith(barangayCode);
        }).length;
      }
      return 0;
    } catch (error) {
      console.error(
        `Error getting streetlight count for ${barangayCode}:`,
        error
      );
      return 0;
    }
  }

  // Update the getBarangayCoordinates method to match your JSON structure
  getBarangayCoordinates(barangayCode, province) {
    // Search through all municipalities and barangays
    for (const municipalityName in this.coordinates[province].municipalities) {
      const municipality =
        this.coordinates[province].municipalities[municipalityName];
      const barangays = municipality.barangays;

      for (const barangayName in barangays) {
        const barangay = barangays[barangayName];
        // Match using barangay_code instead of code
        if (barangay.barangay_code === barangayCode) {
          return {
            lat: barangay.lat,
            long: barangay.long,
            name: barangayName,
            municipality: municipalityName,
          };
        }
      }
    }
    return null;
  }

  // Add new method to get municipality code from SOCID
  getMunicipalityCodeFromSOCID(socid) {
    if (!socid || typeof socid !== "string") {
      console.log(`Invalid SOCID: ${socid}`);
      return null;
    }

    const parts = socid.split("-");
    if (parts.length !== 2) {
      console.log(`Invalid SOCID format: ${socid} (expected format: XXX-YYYY)`);
      return null;
    }

    return parts[0]; // Return the municipality code prefix
  }

  // Update showMunicipalityMarkers to filter by municipality code
  async showMunicipalityMarkers(province) {
    this.municipalityMarkers.clearLayers();
    console.log("Showing municipality markers for province:", province);

    try {
      // Get municipality data from coordinates
      const provinceData = this.coordinates[province];
      if (!provinceData || !provinceData.municipalities) {
        console.error("Invalid province data:", provinceData);
        return;
      }

      // Add markers for municipalities that have matching codes
      for (const municipalityName in provinceData.municipalities) {
        const municipalityData = provinceData.municipalities[municipalityName];

        // Skip if no valid coordinates or municipality code
        if (
          !municipalityData.lat ||
          !municipalityData.long ||
          !municipalityData.municipality_code
        ) {
          console.warn(`Missing data for municipality: ${municipalityName}`);
          continue;
        }

        // Get count statistics from API for this municipality
        const statsResponse = await fetch(
          `api/endpoints/get_count.php?pattern=${municipalityData.municipality_code}`
        );
        const statsData = await statsResponse.json();

        if (statsData.status !== "success" || statsData.data.total === 0) {
          console.log(
            `Skipping ${municipalityName} - no matching streetlights`
          );
          continue;
        }

        console.log(`Municipality ${municipalityName} stats:`, statsData.data);

        // Create marker
        const marker = L.marker([municipalityData.lat, municipalityData.long], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<i class="fas fa-map-marker-alt text-primary fa-2x"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          }),
        });

        const popupContent = `
          <div class="p-3">
            <h6 class="fw-bold mb-3">${municipalityName}</h6>
            
            <div class="row text-center mb-3">
              <div class="col-4">
                <div class="stat-value">${statsData.data.total}</div>
                <div class="stat-label text-muted">Total</div>
              </div>
              <div class="col-4">
                <div class="stat-value text-success">${statsData.data.active}</div>
                <div class="stat-label text-muted">Active</div>
              </div>
              <div class="col-4">
                <div class="stat-value text-danger">${statsData.data.inactive}</div>
                <div class="stat-label text-muted">Inactive</div>
              </div>
            </div>
            
            <button class="btn btn-sm btn-primary w-100 view-details">View Details</button>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on("popupopen", (e) => {
          const popup = e.popup;
          const button = popup._contentNode.querySelector(".view-details");
          if (button) {
            button.addEventListener("click", () => {
              this.showBarangayMarkers(province, municipalityName);
              this.map.flyTo(
                [municipalityData.lat, municipalityData.long],
                this.zoomLevels.municipality
              );
            });
          }
        });

        this.municipalityMarkers.addLayer(marker);
        console.log(`Added marker for ${municipalityName}`);
      }
    } catch (error) {
      console.error("Error showing municipality markers:", error);
    }
  }

  async showBarangayMarkers(province, municipality) {
    this.barangayMarkers.clearLayers();
    console.log("Showing barangay markers for:", province, municipality);

    try {
      // Get barangays from coordinates
      const barangays =
        this.coordinates[province].municipalities[municipality].barangays;
      const municipalityCode =
        this.coordinates[province].municipalities[municipality]
          .municipality_code;

      // Add markers for barangays
      for (const barangayName in barangays) {
        const data = barangays[barangayName];

        // Skip if no valid coordinates or barangay code
        if (!data?.lat || !data?.long || !data?.barangay_code) {
          continue;
        }

        // Get count statistics from API for this barangay
        const fullBarangayCode = municipalityCode + data.barangay_code;
        const statsResponse = await fetch(
          `api/endpoints/get_count.php?pattern=${fullBarangayCode}`
        );
        const statsData = await statsResponse.json();

        if (statsData.status !== "success" || statsData.data.total === 0) {
          console.log(`Skipping ${barangayName} - no streetlights found`);
          continue;
        }

        console.log(`Barangay ${barangayName} stats:`, statsData.data);

        const marker = L.marker([data.lat, data.long], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<i class="fas fa-map-marker-alt text-danger fa-2x"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          }),
          barangayData: {
            name: barangayName,
            municipality: municipality,
            province: province,
            barangayCode: data.barangay_code,
            fullCode: fullBarangayCode,
          },
        });

        const popupContent = this.createBarangayPopupWithStats(
          barangayName,
          municipality,
          province,
          statsData.data
        );

        marker.bindPopup(popupContent);

        this.barangayMarkers.addLayer(marker);
      }

      // Make sure the layer is added to the map
      if (!this.map.hasLayer(this.barangayMarkers)) {
        this.barangayMarkers.addTo(this.map);
      }
    } catch (error) {
      console.error("Error showing barangay markers:", error);
    }
  }

  handleZoom() {
    const zoom = this.map.getZoom();

    if (zoom < 9) {
      this.map.removeLayer(this.municipalityMarkers);
      this.map.removeLayer(this.barangayMarkers);
      this.provinceMarkers.addTo(this.map);
    } else if (zoom < this.zoomLevels.city) {
      this.provinceMarkers.addTo(this.map);
      this.map.removeLayer(this.municipalityMarkers);
      this.map.removeLayer(this.barangayMarkers);
    } else if (zoom < this.zoomLevels.municipality) {
      this.map.removeLayer(this.provinceMarkers);
      this.municipalityMarkers.addTo(this.map);
      this.map.removeLayer(this.barangayMarkers);
    } else {
      this.map.removeLayer(this.provinceMarkers);
      this.map.removeLayer(this.municipalityMarkers);
      this.barangayMarkers.addTo(this.map);
    }
  }

  setupMouseCoordinates() {
    this.map.on("mousemove", (e) => {
      const coordinatesText = `Lat: ${e.latlng.lat.toFixed(
        6
      )}, Lng: ${e.latlng.lng.toFixed(6)}`;
      document.getElementById("coordinates").innerText = coordinatesText;
    });
  }

  createProvincePopup(province) {
    const container = L.DomUtil.create("div", "province-popup");
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    container.innerHTML = `
        <div class="p-3 popup-content">
            <div class="header d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold text-primary mb-0">${province.name}</h5>
                ${
                  isMobile
                    ? `
                    <button class="btn btn-sm btn-outline-primary zoom-to-province">
                        <i class="fas fa-search-plus"></i>
                    </button>
                `
                    : ""
                }
            </div>
            
            <div class="stats-container">
                <div class="stat-item d-flex align-items-center gap-3">
                    <div class="stat-circle bg-primary">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${
                          province.totalStreetlights || 4
                        }</div>
                        <div class="stat-label">Total Streetlights</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add styles
    if (!document.getElementById("province-popup-styles")) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "province-popup-styles";
      styleSheet.textContent = `
            .province-popup {
                min-width: 280px;
                max-width: 320px;
            }
            
            .province-popup .popup-content {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .province-popup .stat-circle {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.2rem;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .province-popup .stat-value {
                font-size: 1.5rem;
                font-weight: bold;
                color: #2c3e50;
                line-height: 1.2;
            }
            
            .province-popup .stat-label {
                color: #6c757d;
                font-size: 0.9rem;
            }
            
            .province-popup .zoom-to-province {
                padding: 0.25rem 0.5rem;
                font-size: 0.9rem;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .province-popup .zoom-to-province:hover {
                background-color: #0d6efd;
                color: white;
                transform: scale(1.05);
            }

            @media (max-width: 576px) {
                .province-popup {
                    min-width: 250px;
                }
                
                .province-popup h5 {
                    font-size: 1.1rem;
                }
                
                .province-popup .stat-value {
                    font-size: 1.3rem;
                }
                
                .province-popup .stat-circle {
                    width: 36px;
                    height: 36px;
                    font-size: 1rem;
                }
            }
        `;
      document.head.appendChild(styleSheet);
    }

    return container;
  }

  createMunicipalityPopup(municipality) {
    const container = L.DomUtil.create("div", "p-3");
    container.innerHTML = `
      <h6 class="fw-bold mb-2">${municipality.name}</h6>
      <p class="mb-2">Total Streetlights: ${municipality.totalStreetlights}</p>
      <button class="btn btn-sm btn-primary view-streetlights">View Streetlights</button>
      <button class="btn btn-sm btn-secondary back-to-provinces">Back to Provinces</button>
    `;

    // Add click handlers after popup is created
    setTimeout(() => {
      const viewButton = container.querySelector(".view-streetlights");
      const backButton = container.querySelector(".back-to-provinces");

      if (viewButton) {
        L.DomEvent.on(viewButton, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          this.loadBarangays(municipality.code);
        });
      }

      if (backButton) {
        L.DomEvent.on(backButton, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          this.loadProvinces();
        });
      }
    }, 0);

    return container;
  }

  createBarangayPopup(barangay) {
    const container = L.DomUtil.create("div", "p-3 barangay-popup");

    // Add barangay code to the data
    const barangayData = {
      ...barangay,
      barangayCode:
        this.coordinates[barangay.province].municipalities[
          barangay.municipality
        ].barangays[barangay.name].barangay_code,
    };

    container.innerHTML = `
        <div class="text-center">
            <h4 class="fw-bold mb-3">${barangay.name}</h4>
            <div class="stats-grid mb-3">
                <div class="stat-item">
                    <div class="stat-value">${barangay.totalStreetlights}</div>
                    <div class="stat-label">Total Streetlights</div>
                </div>
            </div>
            <button class="btn btn-primary view-details mb-2">More Details</button>
        </div>
    `;

    // Add event listener for view details button
    setTimeout(() => {
      const viewButton = container.querySelector(".view-details");
      if (viewButton) {
        L.DomEvent.on(viewButton, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          this.showStreetlightDetails(barangayData, e.target);
        });
      }
    }, 0);

    return container;
  }

  async showStreetlightDetails(barangay, buttonElement) {
    try {
      const data = await StreetlightQueries.getAllData();
      if (data.status !== "success") {
        console.error("Failed to fetch streetlight data");
        return;
      }

      // Filter streetlights for this barangay
      const barangayReadings = data.data.filter((reading) => {
        const parts = reading.socid?.split("-");
        return parts && parts[1] && parts[1].startsWith(barangay.barangayCode);
      });

      // Group readings by SOCID and keep only the latest reading for each streetlight
      const latestReadings = {};
      barangayReadings.forEach((reading) => {
        if (!reading.socid) return;

        const readingDate = new Date(reading.date);
        if (
          !latestReadings[reading.socid] ||
          readingDate > new Date(latestReadings[reading.socid].date)
        ) {
          latestReadings[reading.socid] = reading;
        }
      });

      // Convert to array and sort by SOCID
      const uniqueStreetlights = Object.values(latestReadings).sort((a, b) =>
        a.socid.localeCompare(b.socid)
      );

      // Create content for the details popup
      const detailsContainer = L.DomUtil.create("div", "streetlight-details");
      detailsContainer.innerHTML = `
        <div class="p-3" style="max-height: 400px; overflow-y: auto;">
          <h5 class="fw-bold mb-3">${barangay.name} Streetlights (${
        uniqueStreetlights.length
      })</h5>
          <div class="streetlight-list">
            ${
              uniqueStreetlights.length > 0
                ? uniqueStreetlights
                    .map((light, index) => {
                      const isActive = this.isStreetlightActive(light);
                      const lastUpdated = new Date(light.date).toLocaleString();
                      return `
                  <div class="streetlight-item mb-3 p-2 border rounded">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <div class="fw-bold">
                          <span class="text-primary">${light.socid}</span>
                        </div>
                        <div class="status-indicator ${
                          isActive ? "text-success" : "text-danger"
                        }">
                          <i class="fas fa-lightbulb"></i>
                          ${isActive ? "Active" : "Inactive"}
                        </div>
                        <div class="battery-level text-muted">
                          <i class="fas fa-battery-half"></i>
                          ${light.batsoc}%
                        </div>
                        <div class="update-time small text-muted">
                          <i class="fas fa-clock"></i>
                          ${lastUpdated}
                        </div>
                      </div>
                      <button class="btn btn-sm btn-outline-primary view-details" 
                              data-socid="${light.socid}">
                        View Details
                      </button>
                    </div>
                  </div>
                `;
                    })
                    .join("")
                : '<div class="alert alert-info">No streetlights found in this barangay.</div>'
            }
          </div>
        </div>
      `;

      // Rest of the method remains the same...
      if (!document.getElementById("streetlight-details-styles")) {
        const styleSheet = document.createElement("style");
        styleSheet.id = "streetlight-details-styles";
        styleSheet.textContent = `
          .streetlight-details {
            min-width: 300px;
            max-width: 400px;
          }
          .streetlight-item {
            background: white;
            transition: background-color 0.2s;
          }
          .streetlight-item:hover {
            background: #f8f9fa;
          }
          .status-indicator {
            font-size: 0.9rem;
            margin: 0.2rem 0;
          }
          .battery-level {
            font-size: 0.85rem;
            margin-bottom: 0.2rem;
          }
          .update-time {
            font-size: 0.8rem;
          }
        `;
        document.head.appendChild(styleSheet);
      }

      // Add event listeners for view details buttons
      detailsContainer.querySelectorAll(".view-details").forEach((button) => {
        button.addEventListener("click", () => {
          const socid = button.dataset.socid;
          window.location.href = `details.html?socid=${socid}`;
        });
      });

      // Find the marker position
      const marker = this.findMarkerForBarangay(barangay);

      // Create and show the popup at the marker position or map center if marker not found
      const popupOptions = {
        maxWidth: 400,
        className: "streetlight-details-popup",
      };

      if (marker) {
        L.popup(popupOptions)
          .setLatLng(marker.getLatLng())
          .setContent(detailsContainer)
          .openOn(this.map);
      } else {
        // If marker not found, show popup at map center
        console.warn(
          `Marker not found for barangay ${barangay.name}. Showing popup at map center.`
        );
        L.popup(popupOptions)
          .setLatLng(this.map.getCenter())
          .setContent(detailsContainer)
          .openOn(this.map);
      }
    } catch (error) {
      console.error("Error showing streetlight details:", error);
    }
  }

  showBarangayDetails(barangay) {
    const existingPopup = document.querySelector(".full-screen-popup");
    if (existingPopup) {
      document.body.removeChild(existingPopup);
    }

    const container = document.createElement("div");
    container.className = "full-screen-popup";

    container.innerHTML = `
        <div class="popup-content p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="fw-bold">${barangay.name} Details</h4>
                <button class="btn-close" type="button"></button>
            </div>
            <div class="details-container mb-4">
                <div class="detail-row mb-3">
                    <strong>Municipality:</strong> ${barangay.municipality}
                </div>
                <div class="detail-row mb-3">
                    <strong>Province:</strong> ${barangay.province}
                </div>
                <div class="detail-row mb-3">
                    <strong>Total Streetlights:</strong> ${barangay.totalStreetlights}
                </div>
            </div>
            <div class="text-center">
                <button class="btn btn-primary view-streetlights">View Streetlights</button>
            </div>
        </div>
    `;

    // Add styles
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
        .full-screen-popup {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1500;
        }
        .popup-content {
            background: white;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
            margin: 2rem;
        }
        .detail-row {
            font-size: 1.1rem;
        }
    `;
    document.head.appendChild(styleSheet);

    document.body.appendChild(container);

    // Add event listeners
    const closeButton = container.querySelector(".btn-close");
    const viewButton = container.querySelector(".view-streetlights");

    closeButton.addEventListener("click", () => container.remove());
    container.addEventListener("click", (e) => {
      if (e.target === container) container.remove();
    });

    viewButton.addEventListener("click", () => {
      container.remove();
      this.showMoreDetailsStreetLightsPopup(barangay);
    });
  }

  getStatusBadge(barangay) {
    const status = barangay.batsoc > 20 ? "Active" : "Low Battery";
    const color = barangay.batsoc > 20 ? "success" : "warning";
    return `<span class="badge bg-${color}">${status}</span>`;
  }

  getRandomOffset(maxOffset) {
    return {
      lat: (Math.random() - 0.5) * maxOffset,
      lng: (Math.random() - 0.5) * maxOffset,
    };
  }

  calculateAverageBattery(streetlights) {
    if (!streetlights.length) return 0;
    const total = streetlights.reduce(
      (sum, sl) => sum + parseFloat(sl.batsoc),
      0
    );
    return (total / streetlights.length).toFixed(1);
  }

  createStreetlightPopup(streetlight) {
    return `
      <div class="p-2">
        <h6 class="fw-bold mb-2">Streetlight ${streetlight.socid}</h6>
        <div class="mb-1">
          <strong>Battery:</strong> ${streetlight.batsoc}%
        </div>
        <div class="mb-1">
          <strong>Last Updated:</strong><br>
          ${new Date(streetlight.date).toLocaleString()}
        </div>
      </div>
    `;
  }

  //-----------------------------------More-Details-Pop-Up----------------------------------/
  async showMoreDetailsStreetLightsPopup(barangay) {
    const existingPopup = document.querySelector(".full-screen-popup");
    if (existingPopup) {
      document.body.removeChild(existingPopup);
    }

    try {
      const data = await StreetlightQueries.getAllData();
      if (data.status !== "success") {
        console.error("Failed to fetch streetlight data");
        return;
      }

      // Filter streetlights for this barangay
      const barangayStreetlights = data.data.filter((reading) => {
        const parts = reading.socid?.split("-");
        return parts && parts[1] && parts[1].startsWith(barangay.barangayCode);
      });

      const popupContainer = document.createElement("div");
      popupContainer.className = "full-screen-popup";

      const popupContent = document.createElement("div");
      popupContent.className = "popup-content p-4";
      popupContent.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="fw-bold m-0">${barangay.name} Streetlights</h4>
                <button class="btn-close" type="button"></button>
            </div>
            <div class="streetlights-grid mb-4">
                ${barangayStreetlights
                  .map((light, index) => {
                    const isActive = this.isStreetlightActive(light);
                    return `
                        <div class="streetlight-card">
                            <div class="d-flex align-items-center mb-2">
                                <div class="streetlight-number">#${
                                  index + 1
                                }</div>
                                <div class="ms-3">
                                    <div class="status-indicator ${
                                      isActive ? "active" : "inactive"
                                    }">
                                        <i class="fas fa-lightbulb"></i>
                                        <span>${
                                          isActive ? "Active" : "Inactive"
                                        }</span>
                                    </div>
                                    <div class="battery-level">
                                        <i class="fas fa-battery-half"></i>
                                        ${light.batsoc}%
                                    </div>
                                </div>
                            </div>
                            <button class="btn btn-sm btn-outline-primary view-details w-100" 
                                    data-socid="${light.socid}">
                                View Details
                            </button>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        `;

      // Add styles
      const styleSheet = document.createElement("style");
      styleSheet.textContent = `
            .full-screen-popup {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: flex-start;
                overflow-y: auto;
                z-index: 1500;
                padding: 2rem;
            }
            .popup-content {
                background: white;
                border-radius: 8px;
                max-width: 800px;
                width: 100%;
                margin: auto;
            }
            .streetlights-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 1rem;
            }
            .streetlight-card {
                border: 1px solid #dee2e6;
                border-radius: 6px;
                padding: 1rem;
            }
            .streetlight-number {
                font-size: 1.2rem;
                font-weight: bold;
            }
            .status-indicator {
                font-size: 0.9rem;
                margin-bottom: 0.25rem;
            }
            .status-indicator.active {
                color: #198754;
            }
            .status-indicator.inactive {
                color: #dc3545;
            }
            .battery-level {
                font-size: 0.9rem;
                color: #6c757d;
            }
        `;
      document.head.appendChild(styleSheet);

      popupContainer.appendChild(popupContent);
      document.body.appendChild(popupContainer);

      // Add event listeners
      const closeButton = popupContent.querySelector(".btn-close");
      const viewButtons = popupContent.querySelectorAll(".view-details");

      closeButton.addEventListener("click", () => popupContainer.remove());
      popupContainer.addEventListener("click", (e) => {
        if (e.target === popupContainer) popupContainer.remove();
      });

      viewButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const socid = button.dataset.socid;
          window.location.href = `details.html?socid=${socid}`;
        });
      });
    } catch (error) {
      console.error("Error showing streetlight details:", error);
    }
  }

  isStreetlightActive(light) {
    if (!light) return false;

    // Check if reading is recent (last hour)
    const readingDate = new Date(light.date);
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    if (readingDate < oneHourAgo) return false;

    // Simply check battery level as the primary indicator
    // This matches the simplified logic in details.js
    const batteryLevel = parseFloat(light.batsoc);
    return batteryLevel > 20.0;

    // Note: We've removed the more complex day/night logic to keep consistency
    // with details.js which only uses battery level for determining active status
  }

  showMoreDetailsPopup(streetlight) {
    // Remove any existing popups to avoid duplication
    const existingPopup = document.querySelector(".full-screen-popup");
    if (existingPopup) {
      document.body.removeChild(existingPopup);
    }

    // Create the full-screen popup container
    const popupContainer = document.createElement("div");
    popupContainer.className =
      "full-screen-popup d-flex align-items-center justify-content-center position-fixed top-0 start-0 w-100 h-100 bg-white";
    popupContainer.style.zIndex = "1050"; // Ensure it appears on top
    popupContainer.style.overflowY = "auto";

    // Add the content inside the popup
    popupContainer.innerHTML = `
    <div class="popup-content ;">
      <h4 class="fw-bold text-center mb-3">${
        streetlight.name
      } Street lights</h4>
      <div class="mb-2"><strong>Streetlight ID:</strong> ${
        streetlight.code
      }</div>
      <div class="mb-2"><strong>Status:</strong> ${this.getStatusBadge(
        streetlight
      )}</div>
      <div class="mb-2"><strong>Battery:</strong> ${streetlight.batsoc}%</div>
      <div class="mb-2"><strong>Last Updated:</strong> ${new Date(
        streetlight.date
      ).toLocaleString()}</div>
      <div class="mb-2"><strong>Location:</strong> ${streetlight.lat}, ${
      streetlight.lng
    }</div>
      <div class="mb-2"><strong>Installation Date:</strong> ${new Date(
        streetlight.installationDate
      ).toLocaleDateString()}</div>
      <div class="text-center mt-4">
        <button class="btn btn-secondary close-popup">Close</button>
      </div>
    </div>
  `;

    // Append to body
    document.body.appendChild(popupContainer);

    // Add event listener for closing the popup
    setTimeout(() => {
      const closeButton = popupContainer.querySelector(".close-popup");
      if (closeButton) {
        closeButton.addEventListener("click", () => {
          document.body.removeChild(popupContainer);
        });
      }
    }, 0);
  }

  async updateStatistics() {
    try {
      console.log("Updating statistics...");
      const data = await StreetlightQueries.getAllData();

      if (data.status === "success") {
        // Group by SOCID to get latest reading for each streetlight
        const latestReadings = {};
        data.data.forEach((reading) => {
          if (!reading.socid) return;

          const readingDate = new Date(reading.date);
          if (
            !latestReadings[reading.socid] ||
            readingDate > new Date(latestReadings[reading.socid].date)
          ) {
            latestReadings[reading.socid] = reading;
          }
        });

        const totalCount = Object.keys(latestReadings).length;
        console.log(`Total unique streetlights: ${totalCount}`);

        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        const activeCount = Object.values(latestReadings).filter((light) => {
          const readingDate = new Date(light.date);

          // Check if reading is recent
          if (readingDate < oneHourAgo) {
            console.log(`${light.socid} inactive - old reading`);
            return false;
          }

          const batteryLevel = parseFloat(light.batsoc);
          if (batteryLevel <= 20.0) {
            console.log(
              `${light.socid} inactive - low battery: ${batteryLevel}%`
            );
            return false;
          }

          // Get hour to determine day/night
          const hour = readingDate.getHours();
          const isDaytime = hour >= 6 && hour < 18;

          if (isDaytime) {
            // Daytime criteria
            const pvVoltage = parseFloat(light.pv_voltage);
            const pvCurrent = parseFloat(light.pv_current);
            const isActive = pvVoltage > 12.0 && pvCurrent > 0.1;

            if (!isActive) {
              console.log(
                `${light.socid} inactive - daytime criteria not met:`,
                `PV: ${pvVoltage}V, ${pvCurrent}A`
              );
            }
            return isActive;
          } else {
            // Nighttime criteria
            const bulbVoltage = parseFloat(light.bulbv);
            const batteryCurrent = parseFloat(light.batc);
            const isActive = bulbVoltage > 10.0 && batteryCurrent < -0.1;

            if (!isActive) {
              console.log(
                `${light.socid} inactive - nighttime criteria not met:`,
                `Bulb: ${bulbVoltage}V, Current: ${batteryCurrent}A`
              );
            }
            return isActive;
          }
        }).length;

        const inactiveCount = totalCount - activeCount;

        // Update the display with animation
        this.animateCounter("total-count", totalCount);
        this.animateCounter("active-count", activeCount);
        this.animateCounter("inactive-count", inactiveCount);

        console.log("Statistics updated:", {
          total: totalCount,
          active: activeCount,
          inactive: inactiveCount,
        });
      }
    } catch (error) {
      console.error("Failed to update statistics:", error);
    }
  }

  // Add this helper method for smooth counter animation
  animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000; // Animation duration in milliseconds
    const steps = 60; // Number of steps in animation
    const increment = (targetValue - startValue) / steps;
    let currentStep = 0;

    const animation = setInterval(() => {
      currentStep++;
      const currentValue = Math.round(startValue + increment * currentStep);
      element.textContent = currentValue;

      if (currentStep >= steps) {
        element.textContent = targetValue;
        clearInterval(animation);
      }
    }, duration / steps);
  }

  setupRegionControls() {
    document.querySelectorAll("[data-region]").forEach((element) => {
      element.addEventListener("click", (e) => {
        e.preventDefault();
        const region = e.currentTarget.dataset.region;

        if (this.activeRegions.has(region)) {
          // Deactivate region
          this.activeRegions.delete(region);
          e.currentTarget.classList.remove("active-region");
          if (this.geoJsonLayers[region]) {
            this.geoJsonLayer.removeLayer(this.geoJsonLayers[region]);
          }
          e.currentTarget.querySelector(".region-indicator i").className =
            "fas fa-eye-slash text-muted";
        } else {
          // Activate region
          this.activeRegions.add(region);
          e.currentTarget.classList.add("active-region");
          this.loadRegionGeoJson(region);
          e.currentTarget.querySelector(".region-indicator i").className =
            "fas fa-eye text-primary";
        }
      });
    });
  }

  loadRegionGeoJson(region) {
    const regionFiles = {
      BTU: "agusandelnorte.geojson",
      // Add more region mappings as needed
    };

    if (!regionFiles[region]) {
      console.error(`No GeoJSON file mapping for region: ${region}`);
      return;
    }

    const filePath = `rsc/geojson/${regionFiles[region]}`;
    console.log(`Loading GeoJSON from: ${filePath}`); // Debug log

    fetch(filePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // Remove existing layer if it exists
        if (this.geoJsonLayers[region]) {
          this.geoJsonLayer.removeLayer(this.geoJsonLayers[region]);
        }

        // Create new GeoJSON layer
        const geoJsonLayer = L.geoJSON(data, {
          style: {
            color: "#1671cb",
            weight: 2,
            fillOpacity: 0.3,
            fillColor: "#1671cb",
          },
        });

        // Store reference and add to map
        this.geoJsonLayers[region] = geoJsonLayer;
        this.geoJsonLayer.addLayer(geoJsonLayer);

        console.log(`Successfully loaded GeoJSON for ${region}`); // Debug log
      })
      .catch((error) => {
        console.error(`Error loading GeoJSON for ${region}:`, error);
      });
  }

  showBarangayDetails(barangay) {
    const container = document.createElement("div");
    container.className = "barangay-details p-4";
    container.innerHTML = `
      <h4 class="text-center mb-4">${barangay.name} Details</h4>
      <div class="mb-3">
        <strong>Municipality:</strong> ${barangay.municipality}
      </div>
      <div class="mb-3">
        <strong>Province:</strong> ${barangay.province}
      </div>
      <div class="mb-3">
        <strong>Total Streetlights:</strong> ${barangay.totalStreetlights}
      </div>
      <div class="text-center">
        <button class="btn btn-primary view-streetlights">View Streetlights</button>
      </div>
    `;

    // Show in a modal or popup
    const modal = L.popup()
      .setLatLng(this.map.getCenter())
      .setContent(container)
      .openOn(this.map);

    // Add click handler for view streetlights button
    const viewButton = container.querySelector(".view-streetlights");
    if (viewButton) {
      viewButton.addEventListener("click", () => {
        // Here you can add code to show detailed streetlight list
        console.log(`Showing streetlights for ${barangay.name}`);
        this.showMoreDetailsStreetLightsPopup(barangay);
      });
    }
  }

  createBarangayPopupWithStats(barangayName, municipality, province, stats) {
    const container = L.DomUtil.create("div", "p-3 barangay-popup");

    container.innerHTML = `
      <div class="text-center">
        <h5 class="fw-bold mb-3">${barangayName}</h5>
        
        <div class="row text-center mb-3">
          <div class="col-4">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label text-muted small">Total</div>
          </div>
          <div class="col-4">
            <div class="stat-value text-success">${stats.active}</div>
            <div class="stat-label text-muted small">Active</div>
          </div>
          <div class="col-4">
            <div class="stat-value text-danger">${stats.inactive}</div>
            <div class="stat-label text-muted small">Inactive</div>
          </div>
        </div>
        
        <button class="btn btn-primary view-details mb-2">More Details</button>
      </div>
    `;

    // Add styles if not added already
    if (!document.getElementById("barangay-popup-styles")) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "barangay-popup-styles";
      styleSheet.textContent = `
        .barangay-popup .stat-value {
          font-size: 1.2rem;
          font-weight: bold;
          line-height: 1.2;
        }
        .barangay-popup .stat-label {
          font-size: 0.8rem;
        }
      `;
      document.head.appendChild(styleSheet);
    }

    // Add event listener for view details button
    setTimeout(() => {
      const viewButton = container.querySelector(".view-details");
      if (viewButton) {
        L.DomEvent.on(viewButton, "click", (e) => {
          L.DomEvent.stopPropagation(e);

          // Get barangay code from coordinates
          const barangayCode =
            this.coordinates[province].municipalities[municipality].barangays[
              barangayName
            ].barangay_code;

          this.showStreetlightDetails(
            {
              name: barangayName,
              municipality: municipality,
              province: province,
              barangayCode: barangayCode,
            },
            e.target
          );
        });
      }
    }, 0);

    return container;
  }

  search() {
    const searchInput = document.getElementById("search-input");
    if (!searchInput || !searchInput.value.trim()) {
      alert("Please enter a municipality or province code to search.");
      return;
    }

    const pattern = searchInput.value.trim().toUpperCase();

    // Validate input (should be 3 chars for municipality, 6 chars for barangay)
    if (pattern.length !== 3 && pattern.length !== 6) {
      alert(
        "Please enter a valid code: 3 characters for municipality or 6 characters for barangay."
      );
      return;
    }

    // Show loading indicator
    const resultsContainer = document.getElementById("search-results");
    if (resultsContainer) {
      resultsContainer.innerHTML =
        '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }

    // Call the API endpoint
    fetch(`api/endpoints/get_count.php?pattern=${pattern}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        if (data.status === "success") {
          this.displaySearchResults(data.data, pattern);
        } else {
          throw new Error(data.message || "Error fetching data");
        }
      })
      .catch((error) => {
        if (resultsContainer) {
          resultsContainer.innerHTML = `
            <div class="alert alert-danger" role="alert">
              <i class="fas fa-exclamation-circle me-2"></i>
              ${error.message}
            </div>
          `;
        }
        console.error("Search error:", error);
      });
  }

  // Add this method to the StreetlightMap class
  findMarkerForBarangay(barangay) {
    if (!this.barangayMarkers) return null;

    let foundMarker = null;

    this.barangayMarkers.eachLayer((marker) => {
      const markerData = marker.options.barangayData;
      if (
        markerData &&
        markerData.name === barangay.name &&
        markerData.barangayCode === barangay.barangayCode
      ) {
        foundMarker = marker;
      }
    });

    return foundMarker;
  }
}
