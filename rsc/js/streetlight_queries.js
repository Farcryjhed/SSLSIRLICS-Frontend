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
}
