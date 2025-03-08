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
    for (const province in this.coordinates) {
      const data = this.coordinates[province];

      // Only create marker if province has coordinates and municipalities
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

        marker.bindPopup(
          this.createProvincePopup({
            name: province,
            code: data.province_code,
          })
        );

        marker.on("click", () => {
          this.map.flyTo([data.lat, data.long], this.zoomLevels.city);
          this.showMunicipalityMarkers(province);
        });

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
    const container = L.DomUtil.create("div", "p-3");
    container.innerHTML = `
      <h6 class="fw-bold mb-2">${province.name}</h6>
      <p class="mb-2">Total Streetlights: ${province.totalStreetlights}</p>
      <button class="btn btn-sm btn-primary view-details">View Details</button>
    `;

    // Add click handler after popup is created
    setTimeout(() => {
      const button = container.querySelector(".view-details");
      if (button) {
        L.DomEvent.on(button, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          this.loadMunicipalities(province.code);
        });
      }
    }, 0);

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

  createBarangayPopup(streetlight) {
    const container = L.DomUtil.create("div", "p-3");
    container.innerHTML = `
      <h4 class="fw-bold text-center mb-3">${streetlight.name}</h4>
      <div class="mb-2"><strong>Total:   </strong>  18</div>
      <div class="mb-2"> Active    8 </div>
      <div class="mb-2"> Inactive 10</div>
      <div class="d-flex justify-content-center">
        <button class="btn btn-sm btn-secondary mt-2 moredetails">More Details</button>
      </div>
    `;

    // Add event listener for "More Details" button
    setTimeout(() => {
      const moreDetailsButton = container.querySelector(".moredetails");
      if (moreDetailsButton) {
        L.DomEvent.on(moreDetailsButton, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          this.showMoreDetailsStreetLightsPopup(streetlight); // Open the full-screen popup
        });
      }
    }, 0);

    return container;
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
  showMoreDetailsStreetLightsPopup(streetlight) {
    const existingPopup = document.querySelector(".full-screen-popup");
    if (existingPopup) {
      document.body.removeChild(existingPopup);
    }

    const popupContainer = document.createElement("div");
    popupContainer.className = "full-screen-popup justify-content-center";
    popupContainer.id = "popup";

    // Create close function in the scope
    const closePopup = () => {
      const popup = document.getElementById("popup");
      if (popup) {
        popup.remove();
      }
    };

    const getLightbulbColor = (isActive) => {
      return isActive ? "#edf050" : "#000000";
    };

    popupContainer.innerHTML = `
    <div class="popup-content">
      <button class="close-icon btn-secondary" type="button">
        <i class="fa-solid fa-times"></i>
      </button>
      <h4 class="fw-bold text-center mb-4">${streetlight.name} Streetlights</h4>
      <div class="number-container mb-3">
        <div class="number-square">
          <i class="fa-solid fa-1"></i>
        </div>
        <div class="status-container">
          <span class="ms-2"><strong>Status:</strong></span>
          <span class="ms-1"><i class="fa-solid fa-lightbulb icon-outside" style="color: ${getLightbulbColor(
            true
          )}"></i></span>
          <span class="ms-2"><strong class="me-1">Battery:</strong>Active</span>
        </div>
        <div class="button-container">
          <button class="btn btn-sm btn-secondary viewmoredetails">View More Details</button>
        </div>
      </div>
      <!-- Repeat for numbers 2-7 -->
      ${[2, 3, 4, 5, 6, 7]
        .map(
          (num) => `
        <div class="number-container mb-3">
          <div class="number-square">
            <i class="fa-solid fa-${num}"></i>
          </div>
          <div class="status-container">
            <span class="ms-2"><strong>Status:</strong></span>
            <span class="ms-1"><i class="fa-solid fa-lightbulb icon-outside" style="color: ${getLightbulbColor(
              false
            )}"></i></span>
            <span class="ms-2"><strong class="me-1">Battery:</strong>Inactive</span>
          </div>
          <div class="button-container">
            <button class="btn btn-sm btn-secondary viewmoredetails">View More Details</button>
          </div>
        </div>
      `
        )
        .join("")}
      
      <div class="close-button">
        <button class="btn btn-danger" type="button">Close</button>
      </div>
    </div>
  `;

    // Add styles to head if not already present
    if (!document.getElementById("popup-styles")) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "popup-styles";
      styleSheet.textContent = `
      .full-screen-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        z-index: 1050;
      }
      .popup-content {
        background: white;
        max-width: 800px;
        margin: auto;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
        position: relative;
        max-height: 90vh;
        overflow-y: auto;
        padding-top: 45px; /* Add more top padding to accommodate the close icon */
        padding-bottom: 5px; /* Remove extra bottom padding */
      }
      .number-square {
        width: 37px;
        height: 37px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #000;
        border-radius: 5px;
        font-size: 18px;
        font-weight: bold;
        background-color: #1671cb;
        color: white;
      }
      .number-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .icon-outside {
        font-size: 40px;
        color: #edf050;
      }
      .close-icon {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 24px;
        cursor: pointer;
        background: none;
        border: none;
        padding: 5px;
        transition: color 0.3s ease;
      }
      .close-icon:hover {
        color: #bb2d3b;
      }
      .close-button {
        position: sticky;
        bottom: 0;
        width: 100%;
        padding: 15px;
        background: white;
        text-align: center;
      }
      .number-container {
        display: flex;
        align-items: start;
        gap: 8px;
        position: relative;
        padding-right: 150px; /* Make space for button */
      }
    
      .status-container {
        display: flex;
        align-items: center;
        flex-grow: 1;
        gap: 8px;
      }
    
      .button-container {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
      }
    
      .viewmoredetails {
        white-space: nowrap;
      }
    `;
      document.head.appendChild(styleSheet);
    }
    document.body.appendChild(popupContainer);

    // Add event listeners after appending to DOM
    const closeIcon = popupContainer.querySelector(".close-icon");
    const closeButton = popupContainer.querySelector(
      ".close-button .btn-danger"
    );

    // Add click handlers for both close buttons
    closeIcon.addEventListener("click", closePopup);
    closeButton.addEventListener("click", closePopup);

    // Add click handler for the overlay
    popupContainer.addEventListener("click", (e) => {
      if (e.target === popupContainer) {
        closePopup();
      }
    });
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

  // Add new method to show barangay details
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
