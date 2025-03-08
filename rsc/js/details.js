// Get SOCID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const socid = urlParams.get("socid");

// Chart options
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

function updateStreetlightDetails(data) {
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
  document.getElementById("last-update").textContent = new Date(
    data.date
  ).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  document.getElementById("barangay-text").textContent =
    data.barangay || "Unknown Barangay";

  // Update status badge
  const statusBadge = document.getElementById("status-badge");
  const isActive = parseFloat(data.batsoc) > 20.0;
  statusBadge.textContent = isActive ? "Active" : "Inactive";
  statusBadge.className = `badge bg-${isActive ? "success" : "danger"}`;

  // Update chart with new data point
  const timestamp = new Date(data.date).getTime();
  const batteryLevel = parseFloat(data.batsoc);

  chart.appendData([
    {
      data: [
        {
          x: timestamp,
          y: batteryLevel,
        },
      ],
    },
  ]);

  // Keep only last 24 hours of data
  const series = chart.w.config.series[0].data;
  const twentyFourHoursAgo = timestamp - 24 * 60 * 60 * 1000;
  while (series.length > 0 && series[0].x < twentyFourHoursAgo) {
    series.shift();
  }
}

// Fetch streetlight data
if (socid) {
  fetch(`api/endpoints/get_streetlight_details.php?socid=${socid}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success") {
        updateStreetlightDetails(data.data);
      } else {
        alert("Error: " + data.message);
      }
    })
    .catch((error) => {
      console.error("Error fetching streetlight data:", error);
      alert("Failed to load streetlight data");
    });
} else {
  alert("No streetlight ID provided");
}
