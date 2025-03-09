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
      // Get all streetlight data first
      const streetlightData = await StreetlightQueries.getAllData();
      if (streetlightData.status !== "success") {
        console.error("Failed to fetch streetlight data");
        return;
      }

      console.log("Raw streetlight data:", streetlightData.data);

      // Extract municipality codes from SOCIDs
      const activeMunicipalityCodes = new Set();
      streetlightData.data.forEach((reading) => {
        if (reading?.socid) {
          const parts = reading.socid.split("-");
          if (parts.length === 2) {
            // The first part (e.g., 'BTU', 'CAR') is the municipality code
            const municipalityCode = parts[0];
            activeMunicipalityCodes.add(municipalityCode);
            console.log(
              `Found municipality code: ${municipalityCode} from SOCID: ${reading.socid}`
            );
          }
        }
      });

      console.log(
        `Active municipality codes:`,
        Array.from(activeMunicipalityCodes)
      );

      // Get municipality data from coordinates
      const provinceData = this.coordinates[province];
      if (!provinceData || !provinceData.municipalities) {
        console.error("Invalid province data:", provinceData);
        return;
      }

      // Add markers for municipalities that have matching codes
      for (const municipalityName in provinceData.municipalities) {
        const municipalityData = provinceData.municipalities[municipalityName];
        console.log(
          `Checking municipality: ${municipalityName}`,
          municipalityData
        );

        // Skip if no valid coordinates or municipality code
        if (
          !municipalityData.lat ||
          !municipalityData.long ||
          !municipalityData.municipality_code
        ) {
          console.warn(`Missing data for municipality: ${municipalityName}`);
          continue;
        }

        // Check if this municipality has any matching streetlights
        const hasMatches = activeMunicipalityCodes.has(
          municipalityData.municipality_code
        );
        console.log(
          `Municipality ${municipalityName} (${municipalityData.municipality_code}) matches:`,
          hasMatches
        );

        if (!hasMatches) {
          console.log(
            `Skipping ${municipalityName} - no matching streetlights`
          );
          continue;
        }

        // Get streetlight count for this municipality
        const streetlightCount = streetlightData.data.filter((reading) => {
          if (!reading?.socid) return false;
          const parts = reading.socid.split("-");
          return (
            parts.length === 2 &&
            parts[0] === municipalityData.municipality_code
          );
        }).length;

        console.log(
          `Found ${streetlightCount} streetlights for ${municipalityName}`
        );

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
                    <h6 class="fw-bold mb-2">${municipalityName}</h6>
                    <p class="mb-2">Total Streetlights: ${streetlightCount}</p>
                    <button class="btn btn-sm btn-primary view-details">View Details</button>
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

      // Get all streetlight data
      const streetlightData = await StreetlightQueries.getAllData();
      if (streetlightData.status !== "success") {
        console.error("Failed to fetch streetlight data");
        return;
      }

      // Create a Set of barangay codes that have streetlights
      const activeBarangayCodes = new Set();
      streetlightData.data.forEach((reading) => {
        if (reading?.socid) {
          const parts = reading.socid.split("-");
          if (parts.length === 2) {
            const barangayCode = parts[1].substring(0, 3);
            activeBarangayCodes.add(barangayCode);
          }
        }
      });

      console.log("Active barangay codes:", Array.from(activeBarangayCodes));

      // Add markers only for barangays that have streetlights
      for (const barangayName in barangays) {
        const data = barangays[barangayName];

        // Skip if no valid coordinates or barangay code
        if (!data?.lat || !data?.long || !data?.barangay_code) {
          continue;
        }

        // Skip if barangay has no streetlights
        if (!activeBarangayCodes.has(data.barangay_code)) {
          console.log(`Skipping ${barangayName} - no streetlights found`);
          continue;
        }

        // Get streetlight count for this barangay
        const streetlightCount = streetlightData.data.filter((reading) =>
          reading?.socid?.split("-")[1]?.startsWith(data.barangay_code)
        ).length;

        console.log(
          `Creating marker for ${barangayName} with ${streetlightCount} streetlights`
        );

        const marker = L.marker([data.lat, data.long], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<i class="fas fa-map-marker-alt text-danger fa-2x"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          }),
          barangayData: {
            // Add this line
            name: barangayName,
            municipality: municipality,
            province: province,
            barangayCode: data.barangay_code,
          },
        });

        marker.bindPopup(
          this.createBarangayPopup({
            name: barangayName,
            municipality: municipality,
            province: province,
            totalStreetlights: streetlightCount,
          })
        );

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
        <div class="p-2 popup-content">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="fw-bold text-primary mb-0">${province.name}</h6>
                ${
                  isMobile
                    ? `
                    <button class="btn btn-sm btn-outline-primary zoom-to-province">
                        <i class="fas fa-eye"></i>
                    </button>
                `
                    : ""
                }
            </div>
            
            <div class="stats-container">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <div class="stat-circle bg-primary">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <div>
                        <div class="stat-value">${
                          province.totalStreetlights || 0
                        }</div>
                        <div class="stat-label">Total</div>
                    </div>
                </div>
                
                <div class="status-bars">
                    <div class="status-item mb-1">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="status-label">
                                <i class="fas fa-check-circle text-success"></i> Active
                            </span>
                            <span class="fw-medium">${
                              province.activeStreetlights || 0
                            }</span>
                        </div>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar bg-success" style="width: ${
                              province.totalStreetlights
                                ? (province.activeStreetlights /
                                    province.totalStreetlights) *
                                  100
                                : 0
                            }%"></div>
                        </div>
                    </div>
                    
                    <div class="status-item">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="status-label">
                                <i class="fas fa-times-circle text-danger"></i> Inactive
                            </span>
                            <span class="fw-medium">${
                              province.inactiveStreetlights || 0
                            }</span>
                        </div>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar bg-danger" style="width: ${
                              province.totalStreetlights
                                ? (province.inactiveStreetlights /
                                    province.totalStreetlights) *
                                  100
                                : 0
                            }%"></div>
                        </div>
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
                min-width: 220px;
                max-width: 280px;
            }
            
            .province-popup .popup-content {
                background: white;
                border-radius: 6px;
                font-size: 0.9rem;
            }
            
            .province-popup .stat-circle {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1rem;
            }
            
            .province-popup .stat-value {
                font-size: 1.2rem;
                font-weight: bold;
                color: #333;
                line-height: 1;
            }
            
            .province-popup .stat-label {
                color: #666;
                font-size: 0.8rem;
            }
            
            .province-popup .status-bars {
                margin-top: 0.5rem;
            }
            
            .province-popup .status-label {
                font-size: 0.8rem;
            }
            
            .province-popup .progress {
                background-color: #e9ecef;
                border-radius: 3px;
            }
            
            .province-popup .zoom-to-province {
                padding: 0.15rem 0.4rem;
                font-size: 0.8rem;
                border-radius: 3px;
            }

            .province-popup .zoom-to-province:hover {
                background-color: #0d6efd;
                color: white;
            }

            @media (max-width: 576px) {
                .province-popup {
                    min-width: 200px;
                }
                
                .province-popup h6 {
                    font-size: 0.95rem;
                }
                
                .province-popup .stat-value {
                    font-size: 1.1rem;
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
      const barangayStreetlights = data.data.filter((reading) => {
        const parts = reading.socid?.split("-");
        return parts && parts[1] && parts[1].startsWith(barangay.barangayCode);
      });

      // Create content for the details popup
      const detailsContainer = L.DomUtil.create("div", "streetlight-details");
      detailsContainer.innerHTML = `
            <div class="p-3" style="max-height: 400px; overflow-y: auto;">
                <h5 class="fw-bold mb-3">${barangay.name} Streetlights</h5>
                <div class="streetlight-list">
                    ${barangayStreetlights
                      .map((light, index) => {
                        const isActive = this.isStreetlightActive(light);
                        return `
                            <div class="streetlight-item mb-3 p-2 border rounded">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="fw-bold">Streetlight #${
                                          index + 1
                                        }</div>
                                        <div class="status-indicator ${
                                          isActive
                                            ? "text-success"
                                            : "text-danger"
                                        }">
                                            <i class="fas fa-lightbulb"></i>
                                            ${isActive ? "Active" : "Inactive"}
                                        </div>
                                        <div class="battery-level text-muted">
                                            <i class="fas fa-battery-half"></i>
                                            ${light.batsoc}%
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
                      .join("")}
                </div>
            </div>
        `;

      // Add styles
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
      if (marker) {
        // Create and show the popup at the marker position
        L.popup({
          maxWidth: 400,
          className: "streetlight-details-popup",
        })
          .setLatLng(marker.getLatLng())
          .setContent(detailsContainer)
          .openOn(this.map);
      }
    } catch (error) {
      console.error("Error showing streetlight details:", error);
    }
  }

  // Helper method to find marker for a barangay
  findMarkerForBarangay(barangay) {
    let foundMarker = null;
    this.barangayMarkers.eachLayer((marker) => {
      const markerData = marker.options.barangayData;
      if (markerData && markerData.name === barangay.name) {
        foundMarker = marker;
      }
    });
    return foundMarker;
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

    const readingDate = new Date(light.date);
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Check if reading is recent
    if (readingDate < oneHourAgo) return false;

    // Check battery level
    if (parseFloat(light.batsoc) <= 20.0) return false;

    const hour = readingDate.getHours();
    const isDaytime = hour >= 6 && hour < 18;

    if (isDaytime) {
      // Daytime criteria
      return (
        parseFloat(light.pv_voltage) > 12.0 &&
        parseFloat(light.pv_current) > 0.1
      );
    } else {
      // Nighttime criteria
      return parseFloat(light.bulbv) > 10.0 && parseFloat(light.batc) < -0.1;
    }
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
      const data = await StreetlightQueries.getAllData();

      if (data.status === "success") {
        // Group by SOCID to get latest reading for each streetlight
        const latestReadings = {};
        data.data.forEach((reading) => {
          const readingDate = new Date(reading.date);
          if (
            !latestReadings[reading.socid] ||
            readingDate > new Date(latestReadings[reading.socid].date)
          ) {
            latestReadings[reading.socid] = reading;
          }
        });

        const totalCount = Object.keys(latestReadings).length;
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        const activeCount = Object.values(latestReadings).filter((light) => {
          const readingDate = new Date(light.date);

          // First check if reading is recent
          if (readingDate < oneHourAgo) {
            console.log(`${light.socid} marked inactive - old reading`);
            return false;
          }

          // Check if all values are zero
          const allZero =
            parseFloat(light.voltage) === 0 &&
            parseFloat(light.current) === 0 &&
            parseFloat(light.pv_voltage) === 0 &&
            parseFloat(light.pv_current) === 0 &&
            parseFloat(light.load_voltage) === 0 &&
            parseFloat(light.load_current) === 0 &&
            parseFloat(light.batsoc) === 0;

          if (allZero) {
            console.log(`${light.socid} marked inactive - all values zero`);
            return false;
          }

          // Get hour of reading to determine day/night
          const hour = readingDate.getHours();
          const isDaytime = hour >= 6 && hour < 18; // 6 AM to 6 PM

          if (isDaytime) {
            // Daytime criteria: Should have solar charging
            const isActive =
              parseFloat(light.pv_voltage) > 12.0 && // Minimum solar voltage
              parseFloat(light.pv_current) > 0.1 && // Must be charging
              parseFloat(light.batsoc) > 20.0; // Minimum battery level

            if (!isActive) {
              console.log(
                `${light.socid} marked inactive - daytime criteria not met:`,
                `PV: ${light.pv_voltage}V, ${light.pv_current}A, Bat: ${light.batsoc}%`
              );
            }
            return isActive;
          } else {
            // Nighttime criteria: Should have load drawing current
            const isActive =
              parseFloat(light.batsoc) > 20.0 && // Minimum battery level
              parseFloat(light.bulbv) > 10.0 && // Bulb voltage present
              parseFloat(light.batc) < -0.1; // Battery must be discharging

            if (!isActive) {
              console.log(
                `${light.socid} marked inactive - nighttime criteria not met:`,
                `Bulb: ${light.bulbv}V, Current: ${light.batc}A, Bat: ${light.batsoc}%`
              );
            }
            return isActive;
          }
        }).length;

        const inactiveCount = totalCount - activeCount;

        console.log(
          `Total: ${totalCount}, Active: ${activeCount}, Inactive: ${inactiveCount}`
        );
        console.log("Latest readings:", latestReadings);

        // Update the display
        document.getElementById("total-count").textContent = totalCount;
        document.getElementById("active-count").textContent = activeCount;
        document.getElementById("inactive-count").textContent = inactiveCount;
      }
    } catch (error) {
      console.error("Failed to update statistics:", error);
    }
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
}
