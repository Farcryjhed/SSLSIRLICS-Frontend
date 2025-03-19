class StreetlightMap {
  constructor() {
    this.zoomLevels = {
      city: 10.13,
      municipality: 14,
    };

    // Initialize properties
    this.provinceMarkers = null;
    this.municipalityMarkers = null;
    this.barangayMarkers = null;
    this.map = null;
    this.isInitialized = false; // Add flag to track initialization

    // Initialize GeoJSON layers
    this.geoJsonLayer = null;
    this.geoJsonLayers = {};
    this.activeRegions = new Set();

    // Start the initialization
    this.loadCoordinates();
  }

  setupMap() {
    // Create cache storage
    const tilesCacheStorage = localforage.createInstance({
      name: "map-tiles",
    });

    // Create custom caching layer
    const cachedTileLayer = L.TileLayer.extend({
      createTile: function (coords, done) {
        const tile = document.createElement("img");
        const tileUrl = this.getTileUrl(coords);
        const key = `${coords.z}:${coords.x}:${coords.y}`;

        // Try to get tile from cache first
        tilesCacheStorage.getItem(key).then((cachedTile) => {
          if (cachedTile) {
            tile.src = cachedTile;
            done(null, tile);
          } else {
            // If not in cache, load from network and cache
            fetch(tileUrl)
              .then((response) => response.blob())
              .then((blob) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result;
                  tilesCacheStorage.setItem(key, dataUrl);
                  tile.src = dataUrl;
                  done(null, tile);
                };
                reader.readAsDataURL(blob);
              })
              .catch((error) => {
                console.error("Error caching tile:", error);
                tile.src = tileUrl;
                done(null, tile);
              });
          }
        });

        return tile;
      },
    });

    // Add the cached tile layer
    new cachedTileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://github.com/AlienWolfX">AlienWolfX</a> & <a href="https://github.com/Farcryjhed">Farcryjhed</a>',
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(this.map);

    // Define all GeoJSON files to load
    const geoJsonFiles = {
      ADS: "agusandelsur.geojson",
      ADN: "agusandelnorte.geojson",
      DIN: "dinagatisland.geojson",
      SDN: "surigaodelnorte.geojson",
      SDS: "surigaodelsur.geojson",
    };

    // Initialize GeoJSON layer group
    this.geoJsonLayer = L.layerGroup().addTo(this.map);
    this.geoJsonLayers = {};
    this.activeGeoJsonLayer = null; // Track currently active layer

    // Load all GeoJSON files
    Object.entries(geoJsonFiles).forEach(([regionCode, fileName]) => {
      fetch(`rsc/geojson/${fileName}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          // Add custom CSS styles
          if (!document.getElementById("geojson-styles")) {
            const style = document.createElement("style");
            style.id = "geojson-styles";
            style.textContent = `
              .leaflet-interactive {
                outline: none !important;
              }
              .province-name-tooltip {
                background: none;
                border: none;
                box-shadow: none;
                color: #000;
                font-weight: bold;
                font-size: 16px;
                text-shadow: 
                  -1px -1px 0 #fff,
                  1px -1px 0 #fff,
                  -1px 1px 0 #fff,
                  1px 1px 0 #fff;
                text-align: center;
                pointer-events: none;
                transition: opacity 0.3s;
              }
            `;
            document.head.appendChild(style);
          }

          // Create GeoJSON layer
          this.geoJsonLayers[regionCode] = L.geoJSON(data, {
            style: (feature) => ({
              color: "transparent",
              weight: 0,
              fillOpacity: 0,
              fillColor: "transparent",
              className: "geojson-path",
              smoothFactor: 1.5,
              interactive: true,
              bubblingMouseEvents: false,
            }),
            onEachFeature: (feature, layer) => {
              const isMobile =
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                  navigator.userAgent
                );

              // Track layer state
              layer.isVisible = false;
              layer.nameTooltip = null;

              const showLayer = () => {
                layer.isVisible = true;
                layer.setStyle({
                  color: "#1671cb",
                  weight: 3,
                  fillOpacity: 0.5,
                  fillColor: "#2196f3",
                });
                layer.bringToFront();

                if (
                  feature.properties &&
                  feature.properties.name &&
                  !layer.nameTooltip
                ) {
                  layer.nameTooltip = L.tooltip({
                    permanent: true,
                    direction: "center",
                    className: "province-name-tooltip",
                    offset: [0, 0],
                  })
                    .setContent(feature.properties.name)
                    .setLatLng(layer.getCenter());
                  layer.nameTooltip.addTo(this.map);
                }
              };

              const hideLayer = () => {
                layer.isVisible = false;
                layer.setStyle({
                  color: "transparent",
                  weight: 0,
                  fillOpacity: 0,
                  fillColor: "transparent",
                });
                if (layer.nameTooltip) {
                  layer.nameTooltip.remove();
                  layer.nameTooltip = null;
                }
              };

              layer.on({
                mouseover: (e) => {
                  if (!isMobile && !layer.isVisible) {
                    showLayer();
                  }
                },
                mouseout: (e) => {
                  if (
                    !isMobile &&
                    !this.isMarkerHovered &&
                    layer !== this.activeGeoJsonLayer
                  ) {
                    hideLayer();
                  }
                },
                click: (e) => {
                  const layer = e.target;

                  if (layer === this.activeGeoJsonLayer) {
                    // Deactivate layer
                    this.activeGeoJsonLayer = null;
                    hideLayer();
                  } else {
                    // Deactivate previous active layer
                    if (this.activeGeoJsonLayer) {
                      this.activeGeoJsonLayer.isVisible = false;
                      hideLayer.call(this.activeGeoJsonLayer);
                    }

                    // Activate new layer
                    this.activeGeoJsonLayer = layer;
                    layer.isVisible = true;
                    showLayer();
                  }
                },
              });
            },
          }).addTo(this.geoJsonLayer);

          // console.log(`Successfully loaded GeoJSON for ${regionCode}`);
        })
        .catch((error) => {
          console.error(`Error loading GeoJSON for ${regionCode}:`, error);
        });
    });
  }

  async loadCoordinates() {
    try {
      // Show loader
      this.toggleLoader(true);

      // Check if already initialized
      if (this.isInitialized) {
        console.warn("Map is already initialized");
        this.toggleLoader(false);
        return;
      }

      const response = await fetch("rsc/coordinates.json");
      this.coordinates = await response.json();

      // Initialize map after loading coordinates
      await this.initializeMap();

      this.isInitialized = true; // Mark as initialized

      // Hide loader after everything is loaded
      this.toggleLoader(false);
    } catch (error) {
      console.error("Failed to load coordinates:", error);
      // Hide loader on error
      this.toggleLoader(false);
    }
  }

  async initializeMap() {
    // Check if map is already initialized
    if (this.map) {
      console.warn("Map is already initialized");
      return;
    }

    // Find center point from coordinates
    const center = this.calculateMapCenter();

    // Create the map
    this.map = L.map("map", {
      zoomControl: false,
      zoomSnap: 0.1, // Allows fractional zoom levels with 0.1 steps
      zoomDelta: 0.1, // Mouse wheel zoom changes by 0.1
      wheelPxPerZoomLevel: 100, // Adjusts mouse wheel sensitivity
    }).setView([center.lat, center.long], parseFloat(8.4));

    // Setup the map layers
    this.setupMap();

    // Create layer groups
    this.provinceMarkers = new L.LayerGroup().addTo(this.map);
    this.municipalityMarkers = new L.LayerGroup().addTo(this.map);
    this.barangayMarkers = new L.LayerGroup().addTo(this.map);
    this.geoJsonLayer = new L.LayerGroup().addTo(this.map); // Add GeoJSON layer group

    // Setup event handlers
    this.map.on("zoomend", () => this.handleZoom());
    this.setupRegionControls(); // Add this line to initialize region controls

    // Add initial province markers
    await this.addProvinceMarkers();
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

  async addProvinceMarkers() {
    try {
      // Show loading overlay
      document.querySelector(".loading-overlay").style.display = "flex";

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

          const popupContent = await this.createProvincePopup({
            name: province,
            code: data.province_code,
          });

          marker.bindPopup(popupContent);

          const disableAllGeoJsonInteractions = () => {
            // Hide all GeoJSON layers and disable interactions
            Object.values(this.geoJsonLayers).forEach((layer) => {
              // Make layer invisible
              layer.setStyle({
                color: "transparent",
                weight: 0,
                fillOpacity: 0,
                fillColor: "transparent",
              });

              // Remove tooltips and province names
              layer.eachLayer((sublayer) => {
                // Remove existing tooltips
                if (sublayer.nameTooltip) {
                  sublayer.nameTooltip.remove();
                  sublayer.nameTooltip = null;
                }

                // Remove any bound popups or tooltips
                if (sublayer.getPopup()) {
                  sublayer.unbindPopup();
                }
                if (sublayer.getTooltip()) {
                  sublayer.unbindTooltip();
                }

                // Disable all interactions
                sublayer.off("mouseover");
                sublayer.off("mouseout");
                sublayer.off("click");
                sublayer.options.interactive = false;
              });

              // Reset states
              layer.isVisible = false;
              layer.eachLayer((sublayer) => {
                sublayer.isVisible = false;
              });
            });

            // Clear active layer reference and hover state
            this.activeGeoJsonLayer = null;
            this.isGeoJsonHovered = false;

            // Make entire GeoJSON layer group non-interactive and remove all tooltips
            this.geoJsonLayer.eachLayer((layer) => {
              layer.options.interactive = false;
              // Remove any province name tooltips at the layer group level
              if (layer.nameTooltip) {
                layer.nameTooltip.remove();
                layer.nameTooltip = null;
              }
            });

            // Remove any remaining tooltips from the map
            const tooltips = document.querySelectorAll(
              ".province-name-tooltip"
            );
            tooltips.forEach((tooltip) => tooltip.remove());
          };

          // Update the marker click handlers
          if (isMobile) {
            // Mobile handler
            marker.on("popupopen", (e) => {
              const zoomButton =
                e.popup._contentNode.querySelector(".zoom-to-province");
              if (zoomButton) {
                zoomButton.addEventListener("click", () => {
                  disableAllGeoJsonInteractions(); // Disable all GeoJSON interactions including province names
                  this.provinceMarkers.removeLayer(marker);
                  this.map.flyTo([data.lat, data.long], this.zoomLevels.city);
                  this.showMunicipalityMarkers(province);
                  marker.closePopup();
                });
              }
            });
          } else {
            // Desktop handler
            marker.on("click", () => {
              disableAllGeoJsonInteractions(); // Disable all GeoJSON interactions including province names
              this.provinceMarkers.removeLayer(marker);
              this.map.flyTo([data.lat, data.long], this.zoomLevels.city);
              this.showMunicipalityMarkers(province);
            });
          }

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
                  disableAllGeoJsonInteractions(); // Use new method instead of hideAllGeoJsonLayers
                  this.provinceMarkers.removeLayer(marker); // Remove marker immediately
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
              disableAllGeoJsonInteractions(); // Use new method instead of hideAllGeoJsonLayers
              this.provinceMarkers.removeLayer(marker); // Remove marker immediately
              this.map.flyTo([data.lat, data.long], this.zoomLevels.city);
              this.showMunicipalityMarkers(province);
            });

            marker.bindPopup(popup);
          }

          this.provinceMarkers.addLayer(marker);
        }
      }

      // Hide loading overlay after all markers are added
      document.querySelector(".loading-overlay").style.display = "none";
    } catch (error) {
      console.error("Error adding province markers:", error);
      // Hide loading overlay even if there's an error
      document.querySelector(".loading-overlay").style.display = "none";
    }
  }

  // Add this new method to show/hide loader
  toggleLoader(show) {
    const loader = document.querySelector(".loading-overlay");
    if (loader) {
      loader.style.display = show ? "flex" : "none";
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

    try {
      // Get municipality data from coordinates
      const provinceData = this.coordinates[province];
      if (!provinceData || !provinceData.municipalities) {
        console.error("Invalid province data:", provinceData);
        return;
      }

      // Create batches of municipality requests
      const BATCH_SIZE = 5;
      const municipalities = Object.entries(provinceData.municipalities);
      const batches = [];

      // Split into batches
      for (let i = 0; i < municipalities.length; i += BATCH_SIZE) {
        batches.push(municipalities.slice(i, i + BATCH_SIZE));
      }

      // Process each batch in parallel
      for (const batch of batches) {
        // Process municipalities in current batch concurrently
        const batchPromises = batch.map(
          async ([municipalityName, municipalityData]) => {
            // Skip if no valid coordinates or municipality code
            if (
              !municipalityData.lat ||
              !municipalityData.long ||
              !municipalityData.municipality_code
            ) {
              console.warn(
                `Missing data for municipality: ${municipalityName}`
              );
              return null;
            }

            try {
              // Use the cached version if available
              const cacheKey = `municipality_${municipalityData.municipality_code}`;
              let statsData = StreetlightQueries.getFromCache(cacheKey);

              if (!statsData) {
                // Fetch if not in cache
                const response = await fetch(
                  `api/endpoints/get_count.php?pattern=${municipalityData.municipality_code}`
                );
                statsData = await response.json();
                // Cache the result
                StreetlightQueries.setCache(cacheKey, statsData);
              }

              if (
                statsData.status !== "success" ||
                statsData.data.total === 0
              ) {
                return null;
              }

              // Create marker with cached data
              return {
                marker: L.marker(
                  [municipalityData.lat, municipalityData.long],
                  {
                    icon: L.divIcon({
                      className: "custom-marker",
                      html: '<i class="fas fa-map-marker-alt text-primary fa-2x"></i>',
                      iconSize: [30, 30],
                      iconAnchor: [15, 30],
                    }),
                  }
                ),
                data: {
                  name: municipalityName,
                  stats: statsData.data,
                  location: [municipalityData.lat, municipalityData.long],
                  zoomLevel: this.zoomLevels.municipality,
                },
              };
            } catch (error) {
              console.error(
                `Error processing municipality ${municipalityName}:`,
                error
              );
              return null;
            }
          }
        );

        // Wait for all municipalities in batch to process
        const results = await Promise.all(batchPromises);

        // Add valid markers to the map
        results.forEach((result) => {
          if (result) {
            const { marker, data } = result;

            const popupContent = `
              <div class="modern-popup p-3">
                <div class="popup-header mb-3">
                  <h6 class="fw-bold mb-0 text-center">${data.name}</h6>
                </div>
                
                <div class="stats-grid mb-3">
                  <div class="stat-box">
                    <div class="stat-value">${data.stats.total}</div>
                    <div class="stat-label">Total</div>
                  </div>
                  <div class="stat-box active">
                    <div class="stat-value">${data.stats.active}</div>
                    <div class="stat-label">Active</div>
                  </div>
                  <div class="stat-box inactive">
                    <div class="stat-value">${data.stats.inactive}</div>
                    <div class="stat-label">Inactive</div>
                  </div>
                </div>
                
                <button class="btn btn-sm btn-primary w-100 view-details">View Details</button>
              </div>
            `;

            // Add these styles if not already present
            if (!document.getElementById("modern-popup-styles")) {
              const style = document.createElement("style");
              style.id = "modern-popup-styles";
              style.textContent = `
                .modern-popup {
                  min-width: 250px;
                  max-width: 300px;
                }
                .stats-grid {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 0.5rem;
                  text-align: center;
                }
                .stat-box {
                  padding: 0.5rem;
                  background: #f8f9fa;
                  border-radius: 0.25rem;
                  transition: transform 0.2s;
                }
                .stat-box:hover {
                  transform: translateY(-2px);
                }
                .stat-box.active {
                  background: #e8f5e9;
                }
                .stat-box.inactive {
                  background: #ffebee;
                }
                .stat-value {
                  font-size: 1.25rem;
                  font-weight: bold;
                  color: #212529;
                }
                .stat-label {
                  font-size: 0.75rem;
                  color: #6c757d;
                  margin-top: 0.25rem;
                }
              `;
              document.head.appendChild(style);
            }

            marker.bindPopup(popupContent);
            marker.on("popupopen", (e) => {
              const button =
                e.popup._contentNode.querySelector(".view-details");
              if (button) {
                button.addEventListener("click", () => {
                  this.showBarangayMarkers(province, data.name);
                  this.map.flyTo(data.location, data.zoomLevel);
                });
              }
            });

            this.municipalityMarkers.addLayer(marker);
          }
        });

        // Small delay between batches to prevent UI blocking
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error("Error showing municipality markers:", error);
    }
  }

  async showBarangayMarkers(province, municipality) {
    this.barangayMarkers.clearLayers();

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
          continue;
        }

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
    // Clear existing timeout
    if (this.zoomTimeout) {
      clearTimeout(this.zoomTimeout);
    }

    // Set new timeout
    this.zoomTimeout = setTimeout(() => {
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
    }, 10); // Wait 10ms after zoom ends before updating
  }

  async createProvincePopup(province) {
    // Create a DOM element container
    const container = L.DomUtil.create("div", "province-popup");
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // First get the count data from API
    let streetlightCount = 0;
    try {
      const response = await fetch("../api/endpoints/get_province_counts.php");
      const data = await response.json();

      if (data.status === "success") {
        // Search through municipalities in this province to find matching codes
        const matchingMunicipalities = Object.values(
          this.coordinates[province.name]?.municipalities || {}
        ).map((muni) => muni.municipality_code);

        // Sum up counts for all municipalities in this province
        streetlightCount = data.data.provinces
          .filter((p) => matchingMunicipalities.includes(p.code))
          .reduce((sum, p) => sum + p.count, 0);
      }
    } catch (error) {
      console.error("Error fetching province counts:", error);
      streetlightCount = 0;
    }

    // Create the inner HTML content
    const content = `
      <div class="p-3 popup-content">
        <div class="header d-flex justify-content-between align-items-center mb-3">
          <h5 class="fw-bold text-primary mb-0 text-center">${
            province.name
          }</h5>
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
              <div class="stat-value">${streetlightCount}</div>
              <div class="stat-label">Total Streetlights</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Set the innerHTML of the container
    container.innerHTML = content;

    // Add styles if they don't exist
    if (!document.getElementById("province-popup-styles")) {
      const style = document.createElement("style");
      style.id = "province-popup-styles";
      style.textContent = `
        .province-popup {
          min-width: 200px;
        }
        .stat-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .stat-info {
          flex: 1;
        }
        .stat-value {
          font-size: 1.2rem;
          font-weight: bold;
        }
        .stat-label {
          font-size: 0.8rem;
          color: #6c757d;
        }
      `;
      document.head.appendChild(style);
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
            <h4 class="fw-bold mb-3 ">${barangay.name}</h4>
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
      // console.log("Found readings for barangay:", barangayReadings);
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
          <h5 class="fw-bold mb-3 text-center">${barangay.name} Streetlights (${
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
        button.addEventListener("click", async () => {
          const socid = button.dataset.socid;

          try {
            // First fetch the data
            const response = await fetch(
              `api/endpoints/get_details.php?socid=${socid}`
            );
            const data = await response.json();

            if (data.status === "success") {
              // Create and show popup only after successful data fetch
              const popup = this.createDetailsPopup(socid);

              // Update the details immediately with the fetched data
              const readings = Array.isArray(data.data)
                ? data.data
                : [data.data];
              const latestReading = readings[readings.length - 1];

              // Update basic info
              document.getElementById("barangay-text").textContent = socid;
              document.getElementById("batsoc").textContent =
                latestReading.batsoc;
              document.getElementById("batv").textContent = latestReading.batv;
              document.getElementById("batc").textContent = latestReading.batc;
              document.getElementById("solv").textContent =
                latestReading.pv_voltage;
              document.getElementById("solc").textContent =
                latestReading.pv_current;
              document.getElementById("bulbv").textContent =
                latestReading.bulbv;
              document.getElementById("curv").textContent = latestReading.curv;

              // Update last update time
              const lastUpdate = new Date(latestReading.date).toLocaleString();
              document.getElementById("last-update").textContent = lastUpdate;

              // Update status badge
              const isActive = parseFloat(latestReading.batsoc) > 20.0;
              const statusBadge = document.getElementById("status-badge");
              statusBadge.textContent = isActive ? "Active" : "Inactive";
              statusBadge.className = `badge ${
                isActive ? "bg-success" : "bg-danger"
              }`;

              // Update chart data
              const chartData = readings.map((reading) => ({
                x: new Date(reading.date).getTime(),
                y: parseFloat(reading.batsoc),
              }));

              this.detailsChart.updateSeries([
                {
                  name: "Battery Level",
                  data: chartData,
                },
              ]);
            } else {
              console.error(
                "Failed to load streetlight details:",
                data.message
              );
              alert("Error loading streetlight details: " + data.message);
            }
          } catch (error) {
            console.error("Error loading streetlight details:", error);
            alert("Failed to load streetlight details");
          }
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
            <h4 class="fw-bold mb-3 ">${barangay.name}</h4>
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

    // Check if light has battery level data
    if (!light.batsoc) return false;

    // This is the exact same logic used in details.js
    // In details.js: const isActive = batteryLevel > 20.0;
    const batteryLevel = parseFloat(light.batsoc);
    return batteryLevel > 20.0;
  }

  async updateStatistics() {
    try {
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

        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        const activeCount = Object.values(latestReadings).filter((light) => {
          const readingDate = new Date(light.date);

          // Check if reading is recent
          if (readingDate < oneHourAgo) {
            return false;
          }

          const batteryLevel = parseFloat(light.batsoc);
          if (batteryLevel <= 20.0) {
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
            return isActive;
          } else {
            // Nighttime criteria
            const bulbVoltage = parseFloat(light.bulbv);
            const batteryCurrent = parseFloat(light.batc);
            const isActive = bulbVoltage > 10.0 && batteryCurrent < -0.1;

            if (!isActive) {
            }
            return isActive;
          }
        }).length;

        const inactiveCount = totalCount - activeCount;

        // Update the display with animation
        this.animateCounter("total-count", totalCount);
        this.animateCounter("active-count", activeCount);
        this.animateCounter("inactive-count", inactiveCount);
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
    const filePath = `rsc/geojson/${regionFiles[region]}`;

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
      })
      .catch((error) => {
        console.error(`Error loading GeoJSON for ${region}:`, error);
      });
  }

  showBarangayDetails(barangay) {
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

  createBarangayPopupWithStats(barangayName, municipality, province, stats) {
    const container = L.DomUtil.create("div", "modern-popup p-3");

    container.innerHTML = `
      <div class="popup-header mb-3">
        <h6 class="fw-bold mb-0 text-center">
          ${barangayName}
          ${
            stats.socid
              ? `<div class="streetlight-number">#${stats.socid
                  .split("-")[1]
                  .slice(-3)}</div>`
              : ""
          }
        </h6>
        <div class="text-muted small">${municipality}, ${province}</div>
      </div>
      
      <div class="stats-grid mb-3">
        <div class="stat-box">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-box active">
          <div class="stat-value">${stats.active}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-box inactive">
          <div class="stat-value">${stats.inactive}</div>
          <div class="stat-label">Inactive</div>
        </div>
      </div>
      
      <button class="btn btn-sm btn-primary w-100 view-details">View Streetlights</button>
    `;

    // Add styles for the streetlight number
    if (!document.getElementById("streetlight-number-styles")) {
      const style = document.createElement("style");
      style.id = "streetlight-number-styles";
      style.textContent = `
        .streetlight-number {
          font-size: 0.9rem;
          color: #6c757d;
          margin-top: 4px;
        }
      `;
      document.head.appendChild(style);
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

  // Add this function to your StreetlightMap class
  createDetailsPopup(socid) {
    // Clean up any previous interval
    this.cleanupAutoUpdate();

    // Create popup styles
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      .details-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
      }
  
      .details-popup-content {
        background: white;
        width: 95%;
        max-width: 1200px;
        max-height: 90vh;
        overflow-y: auto;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        position: relative;
        padding: 20px;
      }
  
      .details-close-btn {
        position: absolute;
        top: 13px;
        right: 32px;
        font-size: 30px;
        cursor: pointer;
        background: none;
        border: none;
        color: #666;
        z-index: 2001;
      }
  
      .details-close-btn:hover {
        color: #000;
      }
  
      .details-chart-container {
        min-height: 400px;
      }
    `;
    styleSheet.textContent += `
      .chart-section {
        position: relative;
        width: 100%;
        background: #fff;
        border-radius: 8px;
        padding: 15px;
      }
  
      .chart-container {
        position: relative;
        width: 100%;
        height: 400px !important;
        min-height: 400px;
      }
  
      #charging-chart {
        width: 100%;
        height: 100% !important;
      }
  
      .apexcharts-canvas {
        background: #fff;
        width: 100% !important;
        height: 100% !important;
      }
    `;
    styleSheet.textContent += `
      .battery-status-main {
        position: relative;
      }
    
      .battery-icon-animated {
        transition: all 0.3s ease;
        position: relative;
      }
    
      .battery-icon-animated::after {
        position: absolute;
        right: -12px;
        top: 50%;
        transform: translateY(-50%);
        font-family: "Font Awesome 5 Free";
        font-weight: 900;
        animation: pulseOpacity 1s infinite;
      }
    
      .battery-critical {
        color: #dc3545;
      }
    
      .battery-low {
        color: #ffc107;
      }
    
      .battery-medium {
        color: #17a2b8;
      }
    
      .battery-high {
        color: #28a745;
      }
    
      .battery-charging::after {
        content: "\\f0e7"; /* Lightning bolt */
        color: #28a745;
      }
    
      .battery-discharging::after {
        content: "\\f063"; /* Arrow down */
        color: #dc3545;
      }
    
      @keyframes pulseOpacity {
        0% { opacity: 0.4; }
        50% { opacity: 1; }
        100% { opacity: 0.4; }
      }
    `;
    document.head.appendChild(styleSheet);

    // Create popup HTML
    const popup = document.createElement("div");
    popup.className = "details-popup-overlay";
    popup.innerHTML = `
      <div class="details-popup-content">
        <button class="details-close-btn">&times;</button>
        <div class="container">
          <div class="row g-4">
            <!-- Left Side - Metric Cards -->
            <div class="col-md-4">
              <div class="sticky-top" style="top: 20px">
                <div class="fw-bold fs-4 mb-3 text-center">
                  <span id="barangay-text">-</span>
                </div>
                <!-- Solar Panel Card -->
                <div class="card shadow-sm mb-4 hover-lift">
                  <div class="card-header bg-gradient">
                    <h5 class="mb-0">
                      <i class="fas fa-solar-panel me-2 solar-icon"></i>Solar Panel
                    </h5>
                  </div>
                  <div class="card-body text-center">
                    <div class="row">
                      <div class="col-6">
                        <i class="fas fa-bolt metric-icon solar-icon"></i>
                        <div class="metric-value">
                          <span id="solv">-</span> V
                        </div>
                        <div class="metric-label">Voltage</div>
                      </div>
                      <div class="col-6">
                        <i class="fas fa-charging-station metric-icon solar-icon"></i>
                        <div class="metric-value">
                          <span id="solc">-</span> A
                        </div>
                        <div class="metric-label">Current</div>
                      </div>
                    </div>
                  </div>
                </div>
  
                <!-- Status Card -->
                <div class="card shadow-sm mb-4 hover-lift">
                  <div class="card-header bg-gradient">
                    <h5 class="mb-0">
                      <i class="fas fa-info-circle me-2 status-icon"></i>Status
                    </h5>
                  </div>
                  <div class="card-body text-center">
                    <div class="row">
                      <div class="col-6">
                        <i class="fas fa-clock metric-icon status-icon"></i>
                        <div class="metric-value">
                          <span id="last-update">-</span>
                        </div>
                        <div class="metric-label">Last Updated</div>
                      </div>
                      <div class="col-6">
                        <i class="fas fa-power-off metric-icon status-icon"></i>
                        <div class="metric-value">
                          <span id="status-badge" class="badge bg-secondary">-</span>
                        </div>
                        <div class="metric-label">Current Status</div>
                      </div>
                    </div>
                  </div>
                </div>
  
                <!-- Load Card -->
                <div class="card shadow-sm hover-lift">
                  <div class="card-header bg-gradient">
                    <h5 class="mb-0">
                      <i class="fas fa-lightbulb me-2 load-icon"></i>Load
                    </h5>
                  </div>
                  <div class="card-body text-center">
                    <div class="row">
                      <div class="col-6">
                        <i class="fas fa-bolt metric-icon load-icon"></i>
                        <div class="metric-value">
                          <span id="bulbv">-</span> V
                        </div>
                        <div class="metric-label">Voltage</div>
                      </div>
                      <div class="col-6">
                        <i class="fas fa-charging-station metric-icon load-icon"></i>
                        <div class="metric-value">
                          <span id="curv">-</span> A
                        </div>
                        <div class="metric-label">Current</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
  
            <!-- Battery & Charging History -->
            <div class="col-md-8">
              <div class="card shadow hover-lift h-100">
                <div class="card-header bg-gradient">
                  <h5 class="mb-0">
                    <i class="fas fa-battery-three-quarters me-2 battery-icon"></i>Battery & Charging History
                  </h5>
                </div>
                <div class="card-body p-4">
                  <!-- Battery Info Section -->
                  <div class="row mb-4">
                    <div class="col-md-4">
                      <div
                        class="battery-status-main p-4 rounded bg-light h-100">
                        <i id="battery-icon" class="fas fa-battery-empty battery-icon-animated" style="font-size: 3rem"></i>
                        <div class="display-4 mt-2">
                          <span id="batsoc">-</span>%
                        </div>
                        <div class="text-muted">State of Charge</div>
                      </div>
                    </div>

                    <div class="col-md-8">
                      <div class="row h-100">
                        <div class="col-md-6">
                          <div
                            class="battery-status-main p-4 rounded bg-light h-100">
                            <i
                              class="fas fa-bolt battery-icon"
                              style="font-size: 3rem"></i>
                            <div class="display-5 mt-2">
                              <span id="batv">-</span> V
                            </div>
                            <div class="text-muted">Battery Voltage</div>
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div
                            class="battery-status-main p-4 rounded bg-light h-100">
                            <i
                              class="fas fa-charging-station battery-icon"
                              style="font-size: 3rem"></i>
                            <div class="display-5 mt-2">
                              <span id="batc">-</span> A
                            </div>
                            <div class="text-muted">Charging Current</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Chart Section -->
                  <div class="chart-section">
                    <div class="chart-container" style="height: 400px">
                      <div id="charging-chart"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const closeBtn = popup.querySelector(".details-close-btn");
    closeBtn.addEventListener("click", () => {
      this.cleanupAutoUpdate(); // Clean up interval when popup is closed
      popup.remove();
    });

    popup.addEventListener("click", (e) => {
      if (e.target.classList.contains("details-popup-overlay")) {
        this.cleanupAutoUpdate(); // Clean up interval when popup is closed
        popup.remove();
      }
    });

    // Add popup to body
    document.body.appendChild(popup);

    // Initialize chart with updated options
    const chartOptions = {
      chart: {
        height: "100%",
        width: "100%",
        type: "line",
        background: "#fff",
        animations: {
          enabled: true,
          easing: "linear",
        },
        toolbar: {
          show: false,
        },
      },
      series: [
        {
          name: "Battery Level",
          data: [],
        },
      ],
      xaxis: {
        type: "datetime",
        labels: {
          datetimeFormatter: {
            year: "yyyy",
            month: "MMM 'yy",
            day: "dd MMM",
            hour: "HH:mm",
          },
        },
      },
      yaxis: {
        min: 0,
        max: 100,
        title: {
          text: "Battery Level (%)",
        },
        labels: {
          formatter: (value) => parseFloat(value.toFixed(2)), // Remove trailing zeros
        },
      },
      tooltip: {
        y: {
          formatter: (value) => `${parseFloat(value.toFixed(2))}%`, // Remove trailing zeros in tooltip
        },
      },
      stroke: {
        curve: "smooth",
        width: 2,
      },
      colors: ["#28a745"],
    };

    // Initialize chart after popup is in DOM
    const chart = new ApexCharts(
      popup.querySelector("#charging-chart"),
      chartOptions
    );
    chart.render();

    // Store chart instance for updates
    this.detailsChart = chart;

    // Load data
    this.loadStreetlightData(socid);

    return popup;
  }

  async loadStreetlightData(socid) {
    try {
      // Add a popup update indicator if not exists
      let updateIndicator = document.getElementById("popup-update-indicator");
      if (!updateIndicator) {
        updateIndicator = document.createElement("div");
        updateIndicator.id = "popup-update-indicator";
        updateIndicator.className = "text-center mt-2 mb-3";
        // updateIndicator.innerHTML =
        //   '<small class="text-muted">Loading data...</small>';

        // Insert after the title
        const title = document.getElementById("barangay-text");
        if (title && title.parentNode) {
          title.parentNode.insertBefore(updateIndicator, title.nextSibling);
        }
      }

      const response = await fetch(
        `api/endpoints/get_details.php?socid=${socid}`
      );
      const data = await response.json();

      if (data.status === "success") {
        const readings = Array.isArray(data.data) ? data.data : [data.data];
        readings.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Update chart data
        const chartData = readings.map((reading) => ({
          x: new Date(reading.date).getTime(),
          y: parseFloat(reading.batsoc),
        }));

        this.detailsChart.updateSeries([
          {
            name: "Battery Level",
            data: chartData,
          },
        ]);

        // Update other details
        this.updateStreetlightDetails(readings);

        // // Update indicator text
        // if (updateIndicator) {
        //   updateIndicator.innerHTML = `<small class="text-muted">Last refresh: ${new Date().toLocaleTimeString()}</small>`;
        // }

        // Start auto-update if not already running
        this.setupAutoUpdate(socid);
      } else {
        console.error("API error:", data.message);
        if (updateIndicator) {
          updateIndicator.innerHTML =
            '<small class="text-danger">Error loading data</small>';
        }
        alert("Error: " + data.message);
      }
    } catch (error) {
      console.error("Error fetching streetlight data:", error);
      const updateIndicator = document.getElementById("popup-update-indicator");
      if (updateIndicator) {
        updateIndicator.innerHTML =
          '<small class="text-danger">Failed to load data</small>';
      }
      alert("Failed to load streetlight data");
    }
  }

  // Add new method for auto-updates
  setupAutoUpdate(socid) {
    // Clear any existing interval
    if (this.popupUpdateInterval) {
      clearInterval(this.popupUpdateInterval);
    }

    // Set new interval for 10-second updates
    this.popupUpdateInterval = setInterval(async () => {
      // Don't update if popup is no longer in the DOM
      if (!document.getElementById("charging-chart")) {
        clearInterval(this.popupUpdateInterval);
        return;
      }

      try {
        // Fetch fresh data using StreetlightQueries
        const result = await StreetlightQueries.getStreetlightDetails(socid);

        if (result.status === "success") {
          // Update chart data
          const chartData = result.readings.map((reading) => ({
            x: new Date(reading.date).getTime(),
            y: parseFloat(reading.batsoc),
          }));

          // Update chart if it still exists
          if (this.detailsChart) {
            this.detailsChart.updateSeries([
              {
                name: "Battery Level",
                data: chartData,
              },
            ]);
          }

          // Update other details
          this.updateStreetlightDetails(result.readings);

          // Update battery animation
          const latestReading = result.readings[result.readings.length - 1];
          const batteryLevel = parseFloat(latestReading.batsoc);
          const batteryCurrent = parseFloat(latestReading.batc);
          this.updateBatteryIcon(batteryLevel, batteryCurrent);
        } else {
          console.error("Auto-update error:", result.message);
        }
      } catch (error) {
        console.error("Auto-update error:", error);
      }
    }, 10000); // Fetch every 10 seconds
  }

  // Add cleanup method to the class
  cleanupAutoUpdate() {
    if (this.popupUpdateInterval) {
      clearInterval(this.popupUpdateInterval);
      this.popupUpdateInterval = null;
    }
  }

  updateStreetlightDetails(readings) {
    if (!readings || readings.length === 0) {
      console.error("No readings data available");
      return;
    }

    const latestReading = readings[readings.length - 1];

    // Default to SOCID as fallback
    let locationText = latestReading.socid;
    let barangayName = "Unknown Area";
    let municipalityName = "";
    let provinceName = "";
    let found = false;

    // Parse SOCID to get codes
    if (latestReading.socid && latestReading.socid.includes("-")) {
      const [municipalityCode, fullBarangayId] = latestReading.socid.split("-");
      const barangayPrefix = fullBarangayId.substring(0, 3);
      const streetlightNumber = fullBarangayId.slice(-3); // Get last 3 digits

      // console.log(
      //   `Looking up location for: Municipality code=${municipalityCode}, Barangay prefix=${barangayPrefix}`
      // );

      // Search through all provinces and municipalities
      outerLoop: for (const province in this.coordinates) {
        const municipalities = this.coordinates[province].municipalities;

        for (const municipality in municipalities) {
          const muniData = municipalities[municipality];

          // Try both direct match and case-insensitive match for municipality code
          if (
            muniData.municipality_code === municipalityCode ||
            muniData.municipality_code.toUpperCase() ===
              municipalityCode.toUpperCase()
          ) {
            // Found matching municipality
            municipalityName = municipality;
            provinceName = province;

            // Look for matching barangay
            const barangays = muniData.barangays;
            for (const barangay in barangays) {
              // Try both direct match and case-insensitive match for barangay code
              const currentBarangayCode = barangays[barangay].barangay_code;
              if (
                currentBarangayCode === barangayPrefix ||
                currentBarangayCode.toUpperCase() ===
                  barangayPrefix.toUpperCase()
              ) {
                barangayName = barangay;
                found = true;
                break outerLoop;
              }
            }

            // If we found the municipality but not the barangay
            if (!found) {
              console.log(
                `Municipality ${municipality} found, but no matching barangay for code ${barangayPrefix}`
              );
              break outerLoop;
            }
          }
        }
      }

      // Set location text based on what we found, now including streetlight number
      if (found) {
        locationText = `#${streetlightNumber} - ${barangayName}, ${municipalityName}, ${provinceName}`;
      } else if (municipalityName) {
        locationText = `#${streetlightNumber} - Unknown Area, ${municipalityName}, ${provinceName}`;
      } else {
        // If everything fails, use a cleaner version of the SOCID with streetlight number
        locationText = `#${streetlightNumber} - SOCID: ${latestReading.socid}`;
      }

      // console.log(`Location resolved to: ${locationText}`);
    }

    // Format numeric values for display (remove trailing zeros)
    const formatValue = (value) => {
      if (value === undefined || value === null || isNaN(value)) return "N/A";
      return parseFloat(parseFloat(value).toFixed(2));
    };

    // Update UI elements with data
    const elements = {
      "barangay-text": locationText,
      batsoc: formatValue(latestReading.batsoc),
      batv: formatValue(latestReading.batv),
      batc: formatValue(latestReading.batc),
      solv: formatValue(latestReading.pv_voltage || latestReading.solv),
      solc: formatValue(latestReading.pv_current || latestReading.solc),
      bulbv: formatValue(latestReading.bulbv),
      curv: formatValue(latestReading.curv),
    };

    // Safely update elements if they exist
    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });

    // Update last update time
    const lastUpdateElement = document.getElementById("last-update");
    if (lastUpdateElement) {
      // Format date for readability
      const date = new Date(latestReading.date);
      const formattedDate = date.toLocaleString(undefined, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      lastUpdateElement.textContent = formattedDate;
    }

    // Update status badge
    const statusBadge = document.getElementById("status-badge");
    if (statusBadge) {
      const isActive = parseFloat(latestReading.batsoc) > 20.0;
      statusBadge.textContent = isActive ? "Active" : "Inactive";
      statusBadge.className = `badge ${isActive ? "bg-success" : "bg-danger"}`;
    }

    // Update battery icon animation
    const batteryLevel = parseFloat(latestReading.batsoc);
    const batteryCurrent = parseFloat(latestReading.batc);
    this.updateBatteryIcon(batteryLevel, batteryCurrent);
  }

  async manageTileCache() {
    const tilesCacheStorage = localforage.createInstance({
      name: "map-tiles",
    });

    try {
      const keys = await tilesCacheStorage.keys();

      if (keys.length > 800) {
        // Remove the oldest tiles (first 200)
        const tilesToRemove = keys.slice(0, 200);
        for (const key of tilesToRemove) {
          await tilesCacheStorage.removeItem(key);
        }
        console.log("Cleaned up old tiles from cache");
      }
    } catch (error) {
      console.error("Error managing tile cache:", error);
    }
  }

  updateBatteryIcon(batteryLevel, batteryCurrent) {
    const iconElement = document.getElementById("battery-icon");
    if (!iconElement) return;

    // Remove existing classes
    iconElement.className = "fas battery-icon-animated";

    // Add battery level icon and color class
    let batteryIcon = "";
    let colorClass = "";

    if (batteryLevel <= 20) {
      batteryIcon = "fa-battery-empty";
      colorClass = "battery-critical";
    } else if (batteryLevel <= 40) {
      batteryIcon = "fa-battery-quarter";
      colorClass = "battery-low";
    } else if (batteryLevel <= 60) {
      batteryIcon = "fa-battery-half";
      colorClass = "battery-medium";
    } else if (batteryLevel <= 80) {
      batteryIcon = "fa-battery-three-quarters";
      colorClass = "battery-high";
    } else {
      batteryIcon = "fa-battery-full";
      colorClass = "battery-high";
    }

    // Add charging/discharging indicator
    const chargingClass =
      batteryCurrent > 0
        ? "battery-charging"
        : batteryCurrent < 0
        ? "battery-discharging"
        : "";

    iconElement.classList.add(batteryIcon, colorClass, chargingClass);
  }
}
