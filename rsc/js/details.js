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

// Update your chartOptions to prevent timezone conversion
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
      datetimeUTC: false, // Prevent timezone conversion
      datetimeFormatter: {
        year: "yyyy",
        month: "MMM 'yy",
        day: "dd MMM",
        hour: "HH:mm",
      },
      format: "dd MMM HH:mm:ss", // Added seconds for more precise time
      style: {
        colors: "#666",
        fontSize: "12px",
      },
    },
    tickAmount: 24,
    tooltip: {
      format: "dd MMM HH:mm:ss", // Added seconds for more precise time
    },
  },
  yaxis: {
    min: 0,
    max: 100,
    title: {
      text: "Battery Level (%)",
    },
    labels: {
      formatter: (value) => `${parseFloat(value.toFixed(2))}%`, // Remove trailing zeros
    },
  },
  stroke: {
    curve: "smooth",
    width: 2,
  },
  colors: ["#28a745"],
  grid: {
    borderColor: "#f1f1f1",
    xaxis: {
      lines: {
        show: true,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
    padding: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    },
  },
  tooltip: {
    x: {
      format: "dd MMM HH:mm:ss", // Added seconds for more precise time
    },
    y: {
      formatter: (value) => `${parseFloat(value.toFixed(2))}%`, // Remove trailing zeros
    },
  },
  markers: {
    size: 4,
    colors: ["#28a745"],
    strokeColors: "#fff",
    strokeWidth: 2,
    hover: {
      size: 6,
    },
  },
  dataLabels: {
    enabled: false, // Disable data labels for cleaner look with precise values
  },
};

const chart = new ApexCharts(
  document.querySelector("#charging-chart"),
  chartOptions
);
chart.render();

function findLocation(socid) {
  console.log("Finding location for SOCID:", socid);

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

// Then modify the updateStreetlightDetails function
async function updateStreetlightDetails(readings) {
  console.log("Updating streetlight details with readings:", readings);

  // Check if readings array is empty
  if (!readings || readings.length === 0) {
    console.error("No readings data available");
    document.getElementById("streetlight-title").textContent =
      "No data available";
    document.getElementById("barangay-text").textContent = "Unknown Location";
    document.getElementById("status-badge").textContent = "Unknown";
    document.getElementById("status-badge").className = "badge bg-secondary";
    document.getElementById("last-update").textContent = "No data";

    // Set default values for all fields
    const fields = ["solv", "solc", "batv", "batc", "batsoc", "bulbv", "curv"];
    fields.forEach((field) => {
      document.getElementById(field).textContent = "N/A";
    });

    return;
  }

  const latestReading = readings[readings.length - 1];

  document.getElementById(
    "streetlight-title"
  ).textContent = `Streetlight ${latestReading.socid}`;

  // Display values without trailing zeros
  document.getElementById("solv").textContent = parseFloat(
    parseFloat(latestReading.solv).toFixed(2)
  );
  document.getElementById("solc").textContent = parseFloat(
    parseFloat(latestReading.solc).toFixed(2)
  );
  document.getElementById("batv").textContent = parseFloat(
    parseFloat(latestReading.batv).toFixed(2)
  );
  document.getElementById("batc").textContent = parseFloat(
    parseFloat(latestReading.batc).toFixed(2)
  );
  document.getElementById("batsoc").textContent = parseFloat(
    parseFloat(latestReading.batsoc).toFixed(2)
  );
  document.getElementById("bulbv").textContent = parseFloat(
    parseFloat(latestReading.bulbv).toFixed(2)
  );
  document.getElementById("curv").textContent = parseFloat(
    parseFloat(latestReading.curv).toFixed(2)
  );

  // Format date with seconds included
  const formattedDate = new Date(latestReading.date).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  document.getElementById("last-update").textContent = formattedDate;

  let barangayText = "Unknown Location";
  if (barangayData && latestReading.socid) {
    const location = findLocation(latestReading.socid);
    if (location) {
      barangayText = `${location.barangay}, ${location.municipality}, ${location.province}`;
    }
  }
  document.getElementById("barangay-text").textContent = barangayText;

  const statusBadge = document.getElementById("status-badge");
  const batteryLevel = parseFloat(latestReading.batsoc);
  const isActive = batteryLevel > 20.0;
  statusBadge.textContent = isActive ? "Active" : "Inactive";
  statusBadge.className = `badge bg-${isActive ? "success" : "danger"}`;

  // Create chart data with proper date handling
  const chartData = readings.map((reading) => {
    // Create a proper date using the database timestamp
    // Split the date string into components
    const [datePart, timePart] = reading.date.split(" ");
    const [year, month, day] = datePart.split("-");
    const [hours, minutes, seconds] = timePart.split(":");

    // Create a timestamp exactly as it appears in the database
    // Use UTC to prevent browser timezone conversion
    const timestamp = Date.UTC(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed in JS
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );

    return {
      x: timestamp,
      y: parseFloat(reading.batsoc),
    };
  });

  console.log("Preparing chart data:", {
    totalReadings: chartData.length,
    timeRange: {
      start: new Date(chartData[0].x).toUTCString(), // Log in UTC for comparison
      end: new Date(chartData[chartData.length - 1].x).toUTCString(),
    },
    sample: chartData.slice(0, 2).map((item) => ({
      timestamp: new Date(item.x).toUTCString(),
      original: readings.find((r) => new Date(r.date).getTime() === item.x)
        ?.date,
      value: item.y,
    })),
  });

  chart.updateSeries([
    {
      name: "Battery Level",
      data: chartData,
    },
  ]);

  chart.updateOptions({
    xaxis: {
      type: "datetime",
      datetimeUTC: false, // Prevent timezone conversion - critical setting
      labels: {
        datetimeFormatter: {
          year: "yyyy",
          month: "MMM 'yy",
          day: "dd MMM",
          hour: "HH:mm",
        },
        format: "dd MMM HH:mm",
        style: {
          colors: "#666",
          fontSize: "12px",
        },
      },
      tickAmount: chartData.length > 8 ? 8 : chartData.length,
    },
  });
}

if (socid) {
  console.log("Fetching streetlight data for SOCID:", socid);
  fetch(`api/endpoints/get_details.php?socid=${socid}`)
    .then((response) => response.json())
    .then(async (data) => {
      console.log("API response:", data);
      if (data.status === "success") {
        const readings = Array.isArray(data.data) ? data.data : [data.data];

        readings.sort((a, b) => new Date(a.date) - new Date(b.date));

        await updateStreetlightDetails(readings);
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
