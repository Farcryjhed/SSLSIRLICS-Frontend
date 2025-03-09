let barangayData = null;

console.log("Initializing details.js...");

fetch("rsc/coordinates.json")
  .then((response) => response.json())
  .then((data) => {
    barangayData = data;
    console.log("Coordinates data loaded:", {
      provinces: Object.keys(data),
      dataSize: JSON.stringify(data).length,
    });
  })
  .catch((error) => console.error("Error loading coordinates:", error));

const urlParams = new URLSearchParams(window.location.search);
const socid = urlParams.get("socid");
console.log("SOCID from URL:", socid);

const chartOptions = {
  chart: {
    type: "line",
    height: "100%",
    animations: {
      enabled: true,
      easing: "linear",
      dynamicAnimation: {
        speed: 1000,
      },
    },
    toolbar: {
      show: false,
    },
    parentHeightOffset: 0,
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
  },
  stroke: {
    curve: "smooth",
    width: 2,
  },
  colors: ["#28a745"],
  grid: {
    borderColor: "#f1f1f1",
  },
};

const chart = new ApexCharts(
  document.querySelector("#charging-chart"),
  chartOptions
);
chart.render();

function findLocation(socid) {
  console.log("Finding location for SOCID:", socid);

  // Split SOCID and get first 3 chars of barangay ID
  const [municipalityCode, fullBarangayId] = socid.split("-");
  const barangayPrefix = fullBarangayId.substring(0, 3);

  console.log("Parsed SOCID:", {
    municipalityCode,
    fullBarangayId,
    barangayPrefix,
    length: barangayPrefix.length,
  });

  for (const province in barangayData) {
    const municipalities = barangayData[province].municipalities;

    for (const municipality in municipalities) {
      if (municipalities[municipality].municipality_code === municipalityCode) {
        console.log("Found matching municipality:", {
          province,
          municipality,
          code: municipalityCode,
        });

        const barangays = municipalities[municipality].barangays;

        // Compare only first 3 chars of barangay names
        for (const barangay in barangays) {
          const barangayCode = barangays[barangay].barangay_code;
          if (barangayCode === barangayPrefix) {
            console.log("Found matching barangay:", {
              barangay,
              barangayCode,
              municipality,
              province,
            });
            return {
              barangay,
              municipality,
              province,
            };
          }
        }
      }
    }
  }

  console.log("No location found for SOCID:", socid);
  return null;
}

function updateStreetlightDetails(data) {
  console.log("Updating streetlight details with data:", data);

  // Update basic info
  document.getElementById(
    "streetlight-title"
  ).textContent = `Streetlight ${data.socid}`;
  document.getElementById("solv").textContent = data.solv;
  document.getElementById("solc").textContent = data.solc;
  document.getElementById("batv").textContent = data.batv;
  document.getElementById("batc").textContent = data.batc;
  document.getElementById("batsoc").textContent = data.batsoc;
  document.getElementById("bulbv").textContent = data.bulbv;
  document.getElementById("curv").textContent = data.curv;

  // Format and update timestamp
  const formattedDate = new Date(data.date).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  console.log("Formatted date:", formattedDate);
  document.getElementById("last-update").textContent = formattedDate;

  // Update location
  let barangayText = "Unknown Location";
  if (barangayData && data.socid) {
    const location = findLocation(data.socid);
    console.log("Location lookup result:", location);
    if (location) {
      barangayText = `${location.barangay}, ${location.municipality}, ${location.province}`;
    }
  }
  document.getElementById("barangay-text").textContent = barangayText;

  // Update status
  const statusBadge = document.getElementById("status-badge");
  const batteryLevel = parseFloat(data.batsoc);
  const isActive = batteryLevel > 20.0;
  console.log("Status calculation:", {
    batteryLevel,
    isActive,
  });

  statusBadge.textContent = isActive ? "Active" : "Inactive";
  statusBadge.className = `badge bg-${isActive ? "success" : "danger"}`;

  // Update chart
  const timestamp = new Date(data.date).getTime();
  console.log("Adding data point to chart:", {
    timestamp,
    batteryLevel,
  });

  chart.appendData([
    {
      data: [{ x: timestamp, y: batteryLevel }],
    },
  ]);

  // Cleanup old data points
  const series = chart.w.config.series[0].data;
  const twentyFourHoursAgo = timestamp - 24 * 60 * 60 * 1000;
  const removedPoints = series.filter(
    (point) => point.x < twentyFourHoursAgo
  ).length;

  while (series.length > 0 && series[0].x < twentyFourHoursAgo) {
    series.shift();
  }

  console.log("Chart data cleanup:", {
    removedPoints,
    remainingPoints: series.length,
    oldestTimestamp: series[0]?.x,
    newestTimestamp: series[series.length - 1]?.x,
  });
}

if (socid) {
  console.log("Fetching streetlight data for SOCID:", socid);
  fetch(`api/endpoints/get_streetlight_details.php?socid=${socid}`)
    .then((response) => response.json())
    .then((data) => {
      console.log("API response:", data);
      if (data.status === "success") {
        updateStreetlightDetails(data.data);
      } else {
        console.error("API error:", data.message);
        alert("Error: " + data.message);
      }
    })
    .catch((error) => {
      console.error("Error fetching streetlight data:", error);
      alert("Failed to load streetlight data");
    });
} else {
  console.error("No SOCID provided in URL");
  alert("No streetlight ID provided");
}
