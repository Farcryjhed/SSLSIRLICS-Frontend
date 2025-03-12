class StreetlightQueries {
  static async getAllData() {
    try {
      const response = await fetch("/api/endpoints/get_data_all.php");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch all data:", error);
      throw error;
    }
  }

  static async getMunicipalityData(provinceCode = null) {
    try {
      const url = provinceCode
        ? `/api/endpoints/get_municipality_streetlights.php?municipality=${provinceCode}`
        : "/api/endpoints/get_municipality_streetlights.php";

      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch municipality data:", error);
      throw error;
    }
  }

  static async getBarangayData(municipality) {
    try {
      const response = await fetch(
        `api/endpoints/get_municipality_streetlights.php?municipality=${municipality}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(
        `Failed to fetch barangay data for ${municipality}:`,
        error
      );
      throw error;
    }
  }

  static async getStreetlightDetails(socid) {
    try {
      const response = await fetch(
        `api/endpoints/get_details.php?socid=${socid}`
      );
      const data = await response.json();

      if (data.status === "success") {
        const readings = Array.isArray(data.data) ? data.data : [data.data];
        readings.sort((a, b) => new Date(a.date) - new Date(b.date));
        return { status: "success", readings };
      } else {
        console.error("API error:", data.message);
        return { status: "error", message: data.message };
      }
    } catch (error) {
      console.error("Error fetching streetlight details:", error);
      throw error;
    }
  }

  static async getStreetlightCount(pattern) {
    try {
      const response = await fetch(
        `api/endpoints/get_count.php?pattern=${pattern}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to fetch count for pattern ${pattern}:`, error);
      throw error;
    }
  }
}
