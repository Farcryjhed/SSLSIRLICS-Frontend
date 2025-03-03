class StreetlightMap {
  constructor() {
    // Add zoom level thresholds
    this.zoomLevels = {
      city: 11, // City overview zoom level
      municipality: 14, // Municipality detail zoom level
    };

    this.map = L.map("map", {
      zoomControl: false,
    }).setView([9.215937, 125.981771], 9);

    // Create separate layer groups for different zoom levels
    this.cityMarkers = new L.LayerGroup().addTo(this.map);
    this.municipalityMarkers = new L.LayerGroup().addTo(this.map);
    this.streetlightMarkers = new L.LayerGroup().addTo(this.map);
    this.polygonLayer = new L.LayerGroup().addTo(this.map); // Layer for polygons

// Steps to Display Coordinates on Hover -//
// Event listener for mouse movement to update coordinates
this.map.on("mousemove", (e) => {
  const coordinatesText = `Lat: ${e.latlng.lat.toFixed(6)}, Lng: ${e.latlng.lng.toFixed(6)}`;
  document.getElementById("coordinates").innerText = coordinatesText;
});

// Function to copy coordinates when pressing Ctrl + C
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "c") {
    const coordinatesText = document.getElementById("coordinates").innerText;
    
    // Copy to clipboard
    navigator.clipboard.writeText(coordinatesText).then(() => {

    }).catch(err => {
      console.error("Failed to copy: ", err);
    });
  }
});

//-//
    
    // Add zoom end event listener
    this.map.on("zoomend", () => this.handleZoom());

    // Butuan City Barangays in Database -//
    this.BTUbarangayCoords = {
      "BTU-LIB": { lat: 8.945, lng: 125.528, name: "Libertad" },
      "BTU-DBF": { lat: 8.952, lng: 125.532, name: "Doongan Baan Ferry" },
      "BTU-BAN": { lat: 8.958, lng: 125.535, name: "Baan" },
      "BTU-BON": { lat: 8.963, lng: 125.538, name: "Boning" },
    }
    //end Butuan Barangays in Database -//

    // Surigao City Barangays in Database -//
    this.SURbarangayCoords = {
      "SUR-LUN": { lat: 9.782, lng: 125.485, name: "Luna" },
      "SUR-WAW": { lat: 9.788, lng: 125.488, name: "Washington" },
      "SUR-TIN": { lat: 9.792, lng: 125.492, name: "Tinio" },
      "SUR-CAN": { lat: 9.795, lng: 125.495, name: "Canlanipa" },
    }
    //end Surigao Barangays in Database -//

    // Random coordinates within Butuan and Surigao areas
    this.barangayCoords = {
      // Butuan City barangays (around 8.94-8.97, 125.52-125.54)
      "BTU-LIB": { lat: 8.945, lng: 125.528, name: "Libertad" },
      "BTU-DBF": { lat: 8.952, lng: 125.532, name: "Doongan Baan Ferry" },
      "BTU-BAN": { lat: 8.958, lng: 125.535, name: "Baan" },
      "BTU-BON": { lat: 8.963, lng: 125.538, name: "Boning" },

      // Surigao City barangays (around 9.78-9.80, 125.48-125.50)
      "SUR-LUN": { lat: 9.782, lng: 125.485, name: "Luna" },
      "SUR-WAW": { lat: 9.788, lng: 125.488, name: "Washington" },
      "SUR-TIN": { lat: 9.792, lng: 125.492, name: "Tinio" },
      "SUR-CAN": { lat: 9.783949593493343, lng: 125.49870493222036, name: "Canlanipa" },
    };

  
    // Municipality centers
    this.municipalityCoords = {
      BTU: { lat: 8.955, lng: 125.533, name: "Butuan City" },
      SUR: { lat: 9.797, lng: 125.489, name: "Surigao City" },
    };


    // Create coordinate ranges for each barangay
    this.barangayRanges = {
      "BTU-LIB": {
        lat: { min: 8.944, max: 8.946 },
        lng: { min: 125.527, max: 125.529 },
        name: "Libertad",
      },
      "BTU-DBF": {
        lat: { min: 8.951, max: 8.953 },
        lng: { min: 125.531, max: 125.533 },
        name: "Doongan Baan Ferry",
      },
      "BTU-BAN": {
        lat: { min: 8.957, max: 8.959 },
        lng: { min: 125.534, max: 125.536 },
        name: "Baan",
      },
      "BTU-BON": {
        lat: { min: 8.962, max: 8.964 },
        lng: { min: 125.537, max: 125.539 },
        name: "Boning",
      },
      // Surigao City barangays
      "SUR-LUN": {
        lat: { min: 9.781, max: 9.783 },
        lng: { min: 125.484, max: 125.486 },
        name: "Luna",
      },
      "SUR-WAW": {
        lat: { min: 9.787, max: 9.789 },
        lng: { min: 125.487, max: 125.489 },
        name: "Washington",
      },
      "SUR-TIN": {
        lat: { min: 9.791, max: 9.793 },
        lng: { min: 125.491, max: 125.493 },
        name: "Tinio",
      },
      "SUR-CAN": {
        lat: { min:  9.783949593493343, max:  9.783949593493344 },
        lng: { min: 125.49870493222036, max: 125.49870493222037 },
        name: "Canlanipa",
      },
    };
   

    // Helper function to generate random coordinates within a range
    this.getRandomCoordinate = (min, max) => {
      return Math.random() * (max - min) + min;
    };

    // Add province coordinates
    this.provinceCoords = {
      
      SUR: { lat: 9.787, lng: 125.49, name: "Surigao del Norte" },
      BTU: { lat: 8.955, lng: 125.533, name: "Agusan del Norte" },

    };

  //Provinces of Caraga Region -//
  
    this.Car ={
      ADN: { lat: 9.133, lng: 125.533, name: "Agusan del Norte" },
      ADS: { lat: 9.787, lng: 125.49, name: "Surigao del Norte" },
      AGS: { lat: 8.95, lng: 125.53, name: "Agusan del Sur" },
      SUR: { lat: 9.787, lng: 125.49, name: "Surigao del Sur" },
      DIN: { lat: 9.783, lng: 125.488, name: "Dinagat Islands" },
    }
  
  //end Provinces of Caraga Region -//

  // Municipalities and Cities of Agusan del Norte -//
    this.ADNCoords = {
      CAB: { lat: 9.133, lng: 125.533, name: "Cabadbaran City" },
      BTU: { lat: 8.955, lng: 125.533, name: "Butuan City" },
      CAR: { lat: 9.783, lng: 125.488, name: "Carmen" },
      BUE: { lat: 9.783, lng: 125.488, name: "Buenavista" },
      JAB: { lat: 9.783, lng: 125.488, name: "Jabonga" },
      KIT: { lat: 9.783, lng: 125.488, name: "Kitcharao" },
      LAS: { lat: 9.783, lng: 125.488, name: "Las Nieves" },
      MAG: { lat: 9.783, lng: 125.488, name: "Magallanes" },
      NAS: { lat: 9.783, lng: 125.488, name: "Nasipit" },
      RTR: { lat: 9.783, lng: 125.488, name: "Remedios T. Romualdez" },
      SAN: { lat: 9.783, lng: 125.488, name: "Santiago" },
      TAG: { lat: 9.783, lng: 125.488, name: "Tubay" },
    };
  //end  Municipalities and Cities of Agusan del Norte -//

  // Municipalities of Agusan del Sur -//
    this.ADSCoords = {
      BAY: { lat: 8.95, lng: 125.53, name: "Bayugan City" },
      BUN: { lat: 8.95, lng: 125.53, name: "Bunawan" },
      ESP: { lat: 8.95, lng: 125.53, name: "Esperanza" },
      LAP: { lat: 8.95, lng: 125.53, name: "La Paz" },
      LOR: { lat: 8.95, lng: 125.53, name: "Loreto" },
      PRO: { lat: 8.95, lng: 125.53, name: "Prosperidad" },
      ROS: { lat: 8.95, lng: 125.53, name: "Rosario" },
      SANF: { lat: 8.95, lng: 125.53, name: "San Francisco" },
      SANL: { lat: 8.95, lng: 125.53, name: "San Luis" },
      SANTJ: { lat: 8.95, lng: 125.53, name: "Santa Josefa" },
      TAL: { lat: 8.95, lng: 125.53, name: "Talacogon" },
      TREN: { lat: 8.95, lng: 125.53, name: "Trento" },
      SIB: { lat: 8.95, lng: 125.53, name: "Sibagat" },
      VER: { lat: 8.95, lng: 125.53, name: "Veruela" },
    };
  //end  Municipalities of Agusan del Sur -//

  // Municipalities and Cities of Surigao del Norte -//
  this.SDNCoords = {
    SUR: { lat: 9.783, lng: 125.488, name: "Surigao City" },
    DAP: { lat: 9.783, lng: 125.488, name: "Dapa" },
    ALE: { lat: 9.783, lng: 125.488, name: "Alegria" },
    BAC: { lat: 9.783, lng: 125.488, name: "Bacuag" },
    BUR: { lat: 9.783, lng: 125.488, name: "Burgos" },
    CLA: { lat: 9.783, lng: 125.488, name: "Claver" },
    DELC: { lat: 9.783, lng: 125.488, name: "Del Carmen" },
    GENL: { lat: 9.783, lng: 125.488, name: "General Luna" },
    GIG: { lat: 9.783, lng: 125.488, name: "Gigaquit" },
    MAI: { lat: 9.783, lng: 125.488, name: "Mainit" },
    MAL: { lat: 9.783, lng: 125.488, name: "Malimono" },
    PILA: { lat: 9.783, lng: 125.488, name: "Pilar" },
    PLA: { lat: 9.783, lng: 125.488, name: "Placer" },
    SANB: { lat: 9.783, lng: 125.488, name: "San Benito" },
    SANF: { lat: 9.783, lng: 125.488, name: "San Francisco" },
    SANI: { lat: 9.783, lng: 125.488, name: "San Isidro" },
    SANTM: { lat: 9.783, lng: 125.488, name: "Santa Monica" },
    SISO: { lat: 9.783, lng: 125.488, name: "Sison" },
    SOCO: { lat: 9.783, lng: 125.488, name: "Socorro" },
    TAGA: { lat: 9.783, lng: 125.488, name: "Tagana-an" },
    TUB: { lat: 9.783, lng: 125.488, name: "Tubod" },
  };
  //end  Municipalities and Cities of Surigao del Norte -//

    // Municipalities and Cities of Surigao del Sur -//
    this.SDSCoords = {
      BIS: { lat: 9.783, lng: 125.488, name: "Bislig City" },
      TAN: { lat: 9.783, lng: 125.488, name: "Tandag City" },
      BAR: { lat: 9.783, lng: 125.488, name: "Barobo" },
      BAY: { lat: 9.783, lng: 125.488, name: "Bayabas" },
      CAG: { lat: 9.783, lng: 125.488, name: "Cagwait" },
      CAN: { lat: 9.783, lng: 125.488, name: "Cantilan" },
      SDSCAR: { lat: 9.783, lng: 125.488, name: "Carmen" },
      CARR: { lat: 9.783, lng: 125.488, name: "Carrascal" },
      COR: { lat: 9.783, lng: 125.488, name: "Cortes" },
      HIN: { lat: 9.783, lng: 125.488, name: "Hinatuan" },
      LAN: { lat: 9.783, lng: 125.488, name: "Lanuza" },
      LIA: { lat: 9.783, lng: 125.488, name: "Lianga" },
      LING: { lat: 9.783, lng: 125.488, name: "Lingig" },
      MAD: { lat: 9.783, lng: 125.488, name: "Madrid" },
      MAR: { lat: 9.783, lng: 125.488, name: "Marihatag" },
      SANA: { lat: 9.783, lng: 125.488, name: "San Agustin" },
      SANM: { lat: 9.783, lng: 125.488, name: "San Miguel" },
      TAG: { lat: 9.783, lng: 125.488, name: "Tagbina" },
      TAGO: { lat: 9.783, lng: 125.488, name: "Tago" },
    };
    //end  Municipalities and Cities of Surigao del Sur -//


    // Municipalities and Cities of Dinagat Island -//
    this.DICoords = {
      BAS: { lat: 9.783, lng: 125.488, name: "Basilisa" },
      CAGD: { lat: 9.783, lng: 125.488, name: "Cagdianao" },
      DINAG: { lat: 9.783, lng: 125.488, name: "Dinagat" },
      LIBJ: { lat: 9.783, lng: 125.488, name: "Libjo" },
      LORE: { lat: 9.783, lng: 125.488, name: "Loreto" },
      SANJO: { lat: 9.783, lng: 125.488, name: "San Jose" },
      TuBA: { lat: 9.783, lng: 125.488, name: "Tubajon" },
    };
    //end  Municipalities and Cities of Dinagat Island -//

    this.setupMap();
    this.markers = new L.LayerGroup().addTo(this.map);
    this.loadProvinces(); // Change initial load to provinces
   

    // Add zoom levels configuration
    this.zoomLevels = {
      city: 11, // City overview zoom level
      municipality: 14, // Municipality detail zoom level
    };
  }

  handleZoom() {
    const currentZoom = this.map.getZoom();

    if (currentZoom < 9) {
      // Show province markers
      this.map.removeLayer(this.municipalityMarkers);
      this.map.removeLayer(this.streetlightMarkers);
      this.cityMarkers.addTo(this.map);
      // Reload provinces if they're not visible
      if (this.cityMarkers.getLayers().length === 0) {
        this.loadProvinces();
      }
    } else if (currentZoom < this.zoomLevels.city) {
      // Show city markers
      this.cityMarkers.addTo(this.map);
      this.map.removeLayer(this.municipalityMarkers);
      this.map.removeLayer(this.streetlightMarkers);
    } else if (currentZoom < this.zoomLevels.municipality) {
      // Show municipality markers
      this.map.removeLayer(this.cityMarkers);
      this.municipalityMarkers.addTo(this.map);
      this.map.removeLayer(this.streetlightMarkers);
    } else {
      // Show streetlight markers
      this.map.removeLayer(this.cityMarkers);
      this.map.removeLayer(this.municipalityMarkers);
      this.streetlightMarkers.addTo(this.map);
    }
  }

  setupMap() {
    L.control.zoom({ position: "topright" }).addTo(this.map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://github.com/AlienWolfX" target="_blank">Allen Cruiz</a>',
    }).addTo(this.map);
  }

  async loadProvinces() {
    try {
      console.log("Loading provinces...");
      const response = await fetch("/api/endpoints/get_data_all.php");
      const data = await response.json();
      console.log("Provinces data received:", data);

      if (data.status === "success") {
        this.clearMarkers();

        // Reset zoom to overview level
        this.map.flyTo([9.215937, 125.981771], 8.50, {
          duration: 1.5,
          easeLinearity: 0.25,
        });

        // Group data by province code (first 3 letters)
        const groupedData = data.data.reduce((acc, item) => {
          const provinceCode = item.socid.substring(0, 3);
          if (!acc[provinceCode]) {
            acc[provinceCode] = {
              code: provinceCode,
              ...this.provinceCoords[provinceCode],
              totalStreetlights: 0,
              streetlights: [],
            };
          }
          acc[provinceCode].totalStreetlights++;
          acc[provinceCode].streetlights.push(item);
          return acc;
        }, {});

        // Add markers for each province with click event to zoom
        Object.values(groupedData).forEach((province) => {
          const marker = this.addProvinceMarker(province);

        });
      }
    } catch (error) {
      console.error("Failed to load provinces:", error);
    }
  }


  async loadMunicipalities(provinceCode = null) {
    try {
      console.log(
        `Loading municipalities${provinceCode ? ` for ${provinceCode}` : ""}...`
      );
      const url = provinceCode
        ? `/api/endpoints/get_municipality_streetlights.php?municipality=${provinceCode}`
        : "/api/endpoints/get_municipality_streetlights.php";

      const response = await fetch(url);
      const data = await response.json();
      console.log("Municipalities data received:", data);

      if (data.status === "success") {
        this.clearMarkers();

    
        // Group data by municipality code (BTU, SUR, etc.)
        const groupedData = data.data.reduce((acc, item) => {
          const municipalityCode = item.socid.split("-")[0];
          if (!acc[municipalityCode]) {
            acc[municipalityCode] = {
              code: municipalityCode,
              ...this.municipalityCoords[municipalityCode],
              totalStreetlights: 0,
              streetlights: [],
            };
          }
          acc[municipalityCode].totalStreetlights++;
          acc[municipalityCode].streetlights.push(item);
          return acc;
        }, {});

        console.log(
          `Adding ${Object.keys(groupedData).length} municipality markers`
        );

        // Add markers for each municipality
        Object.values(groupedData).forEach((municipality) => {
          console.log("Adding municipality marker:", municipality);
          if (municipality.lat && municipality.lng) {
            // Add both city and municipality markers
            this.addMunicipalityMarker(municipality);
          } else {
            console.warn(
              `Missing coordinates for municipality: ${municipality.code}`
            );
          }
        });

        // Update marker visibility based on current zoom
        this.handleZoom();
      } else {
        console.warn("Failed to load municipalities:", data.message);
      }
    } catch (error) {
      console.error("Failed to load municipalities:", error);
    }
  }

  async loadBarangays(municipality) {
    try {
      console.log(`Loading barangays for ${municipality}...`);
      const response = await fetch(
        `api/endpoints/get_municipality_streetlights.php?municipality=${municipality}`
      );
      const data = await response.json();
      console.log("Barangay data received:", data);

      if (data.status === "success") {
        this.clearMarkers();
        console.log(`Adding ${data.data.length} barangay markers`);

        // Group by barangay first
        const groupedByBarangay = {};
        data.data.forEach((item) => {
          // Get just the barangay code part (e.g., 'BTU-LIB' from 'BTU-LIB001')
          const barangayCode = item.socid.match(/([A-Z]{3}-[A-Z]{3})/)[0];
          if (!groupedByBarangay[barangayCode]) {
            const coords = this.barangayCoords[barangayCode];
            if (coords) {
              groupedByBarangay[barangayCode] = {
                code: barangayCode,
                name: coords.name,
                lat: coords.lat,
                lng: coords.lng,
                streetlights: [],
                totalStreetlights: 0,
              };
            }
          }
          if (groupedByBarangay[barangayCode]) {
            groupedByBarangay[barangayCode].streetlights.push(item);
            groupedByBarangay[barangayCode].totalStreetlights++;
          }
        });

        // Add markers for each barangay (color red)
        Object.values(groupedByBarangay).forEach((barangay) => {
          if (barangay.lat && barangay.lng) {
            // Create a marker for the barangay center
            const barangayMarker = L.marker([barangay.lat, barangay.lng], {
              icon: L.divIcon({
                className: "custom-marker",
                html: '<i class="fas fa-map-marker-alt text-danger fa-2x"></i>',
                iconSize: [30, 30],
                iconAnchor: [12, 30],
              }),
            });

            // Add popup with barangay info
            barangayMarker.bindPopup(
              this.createBarangayPopup({
                name: barangay.name,
                code: barangay.code,
                totalStreetlights: barangay.totalStreetlights,
                date: barangay.streetlights[0]?.date,
                batsoc: this.calculateAverageBattery(barangay.streetlights),
              })
            );

            this.streetlightMarkers.addLayer(barangayMarker);

          }
        });

        // Call handleZoom to update visibility
        this.handleZoom();
      }
    } catch (error) {
      console.error(`Failed to load barangays for ${municipality}:`, error);
    }
  }

  clearMarkers() {
    this.cityMarkers.clearLayers();
    this.municipalityMarkers.clearLayers();
    this.streetlightMarkers.clearLayers();
  }

     //    SUR: { lat: 9.561427, lng: 125.783977, name: "Surigao del Norte" },
     // BTU: { lat: 8.879704, lng: 125.48, name: "Agusan del Norte" },

     addProvinceMarker(province) {
      if (!province.lat || !province.lng) {
          console.error("❌ Invalid coordinates for province:", province);
          return;
      }
  
      // Define custom icon positions for each province
      const customIconPositions = {
          "BTU": { iconSize: [50, 50], iconAnchor: [27, 21] }, // Example
          "SUR": { iconSize: [40, 40], iconAnchor: [-62.25, -18] }, // Example
  
          // Add more as needed
      };
  
      // Get custom icon settings or use default
      const { iconSize, iconAnchor } = customIconPositions[province.code] || { iconSize: [40, 40], iconAnchor: [13, 40] };
  
      // Create marker with adjustable icon position
      const marker = L.marker([province.lat, province.lng], {
          icon: L.divIcon({
              className: "custom-marker",
              html: '<i class="fas fa-building text-primary fa-3x"></i>',
              iconSize: iconSize,
              iconAnchor: iconAnchor,
          }),
      });
  
      // Preserve click functionality
      marker.bindPopup(this.createProvincePopup(province)).on("click", () => {
          console.log(`📍 Zooming to: ${province.code} (${province.lat}, ${province.lng})`);
          this.map.flyTo([province.lat, province.lng], this.zoomLevels.city, {
              duration: 1.5,
              easeLinearity: 0.25,
          });
          this.loadMunicipalities(province.code);
      });
  
      // Add marker to the map
      this.cityMarkers.addLayer(marker);
  }
  
  addMunicipalityMarker(municipality) {
    if (!municipality.lat || !municipality.lng) {
      console.error("Invalid coordinates for municipality:", municipality);
      return;
    }
    // municipality tulo ka
    const marker = L.marker([municipality.lat, municipality.lng], {
      icon: L.divIcon({
        className: "custom-marker",
        html: '<i class="fas fa-city text-primary fa-3x"></i>',
        iconSize: [30, 30],
        iconAnchor: [17, 34],
      }),
    });

    marker
      .bindPopup(this.createMunicipalityPopup(municipality))
      .on("click", () => {
        // Zoom to municipality level
        this.map.flyTo(
          [municipality.lat, municipality.lng],
          this.zoomLevels.municipality,
          {
            duration: 1.5,
            easeLinearity: 0.25,
          }
        );
        this.loadBarangays(municipality.code);
      });

    this.municipalityMarkers.addLayer(marker);

    // Add a city marker at a higher zoom level
    const cityMarker = L.marker([municipality.lat, municipality.lng], {
      icon: L.divIcon({
        className: "custom-marker",
        html: '<i class="fas fa-city text-primary fa-3x"></i>',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      }),
    });

    cityMarker
      .bindPopup(this.createMunicipalityPopup(municipality))
      .on("click", () => {
        this.map.flyTo(
          [municipality.lat, municipality.lng],
          this.zoomLevels.city,
          { duration: 1.5, easeLinearity: 0.25 }
        );
        this.loadBarangays(municipality.code);
      });

    this.cityMarkers.addLayer(cityMarker);
  }

  addBarangayMarker(barangay) {
    if (!barangay.lat || !barangay.lng) {
      console.error("Invalid coordinates for barangay:", barangay);
      return;
    }

    const marker = L.marker([barangay.lat, barangay.lng], {
      icon: L.divIcon({
        className: "custom-marker",
        html: '<i class="fas fa-map-marker-alt text-danger fa-2x"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      }),
    });

    marker.bindPopup(this.createBarangayPopup(barangay));
    this.streetlightMarkers.addLayer(marker);
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
      <div class="mb-2"><strong>Total:</strong>18</div>
      <div class="mb-2"><strong>Status:</strong> Active 8 </div>
      <div class="mb-2"><strong>Status:</strong> Inactive 10</div>
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
  // Remove any existing popups to avoid duplication
  const existingPopup = document.querySelector(".full-screen-popup");
  if (existingPopup) {
    document.body.removeChild(existingPopup);
  }

  // Create the full-screen popup container
  const popupContainer = document.createElement("div");
  popupContainer.className = "full-screen-popup d-flex position-fixed top-0 start-0 w-100 h-100 bg-white";
  popupContainer.style.zIndex = "1050"; // Ensure it appears on top
  popupContainer.style.overflowY = "auto";

  // Add the content inside the popup
  popupContainer.innerHTML = `
    <div class="popup-content ;">
      <h4 class="fw-bold text-center mb-3">${streetlight.name}</h4>
      <div class="mb-2"><i class="fas fa-map-marker-alt text-danger fa-2x"></i></strong>18</div>
      <div class="mb-2"><strong>Status:</strong> Active 8 </div>
      <div class="mb-2"><strong>Status:</strong> Inactive 10</div>
      <div class="text-center mt-4">
        <button class="btn btn-danger close-popup">Close</button>
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



showMoreDetailsPopup(streetlight) {
  // Remove any existing popups to avoid duplication
  const existingPopup = document.querySelector(".full-screen-popup");
  if (existingPopup) {
    document.body.removeChild(existingPopup);
  }

  // Create the full-screen popup container
  const popupContainer = document.createElement("div");
  popupContainer.className = "full-screen-popup d-flex align-items-center justify-content-center position-fixed top-0 start-0 w-100 h-100 bg-white";
  popupContainer.style.zIndex = "1050"; // Ensure it appears on top
  popupContainer.style.overflowY = "auto";

  // Add the content inside the popup
  popupContainer.innerHTML = `
    <div class="popup-content ;">
      <h4 class="fw-bold text-center mb-3">${streetlight.name}</h4>
      <div class="mb-2"><strong>Streetlight ID:</strong> ${streetlight.code}</div>
      <div class="mb-2"><strong>Status:</strong> ${this.getStatusBadge(streetlight)}</div>
      <div class="mb-2"><strong>Battery:</strong> ${streetlight.batsoc}%</div>
      <div class="mb-2"><strong>Last Updated:</strong> ${new Date(streetlight.date).toLocaleString()}</div>
      <div class="mb-2"><strong>Location:</strong> ${streetlight.lat}, ${streetlight.lng}</div>
      <div class="mb-2"><strong>Installation Date:</strong> ${new Date(streetlight.installationDate).toLocaleDateString()}</div>
      <div class="text-center mt-4">
        <button class="btn btn-danger close-popup">Close</button>
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
  
//-----------------------------------Polygon-----------------------------------/
//edited or kanang gi add nako kay naay -// sa comments //

//pending last be edited because it is not too important

// Steps to Display Coordinates on Hover that can easily copy the coordinates-//

//-//
}







