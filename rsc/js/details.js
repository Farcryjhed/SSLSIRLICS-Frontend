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
      format: "HH:mm",
      style: {
        colors: "#666",
        fontSize: "12px",
      },
    },
    tickAmount: 24,
    tooltip: {
      format: "HH:mm",
    },
  },
  yaxis: {
    min: 0,
    max: 100,
    title: {
      text: "Battery Level (%)",
    },
    labels: {
      formatter: (value) => `${Math.round(value)}%`,
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
      format: "HH:mm",
    },
    y: {
      formatter: (value) => `${Math.round(value)}%`,
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

async function fetchHistoricalData(socid) {
  try {
    const response = await fetch(
      `api/endpoints/get_streetlight_history.php?socid=${socid}`
    );
    const data = await response.json();
    if (data.status === "success") {
      return data.data;
    }
    console.error("Error fetching historical data:", data.message);
    return [];
  } catch (error) {
    console.error("Failed to fetch historical data:", error);
    return [];
  }
}

async function updateStreetlightDetails(readings) {
  console.log("Updating streetlight details with readings:", readings);

  const latestReading = readings[readings.length - 1];

  document.getElementById(
    "streetlight-title"
  ).textContent = `Streetlight ${latestReading.socid}`;
  document.getElementById("solv").textContent = latestReading.solv;
  document.getElementById("solc").textContent = latestReading.solc;
  document.getElementById("batv").textContent = latestReading.batv;
  document.getElementById("batc").textContent = latestReading.batc;
  document.getElementById("batsoc").textContent = latestReading.batsoc;
  document.getElementById("bulbv").textContent = latestReading.bulbv;
  document.getElementById("curv").textContent = latestReading.curv;

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

  const chartData = readings.map((reading) => ({
    x: new Date(reading.date).getTime(),
    y: parseFloat(reading.batsoc),
  }));

  console.log("Preparing chart data:", {
    totalReadings: chartData.length,
    timeRange: {
      start: new Date(chartData[0].x).toLocaleString(),
      end: new Date(chartData[chartData.length - 1].x).toLocaleString(),
    },
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
