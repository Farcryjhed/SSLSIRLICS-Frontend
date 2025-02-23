<?php
class StreetlightController {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getStreetlights() {
        try {
            $query = "SELECT * FROM streetdata1 ORDER BY DATE DESC LIMIT 100";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            $result = array();
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $result[] = array(
                    "socid" => $row['SOCID'],
                    "bulbv" => floatval($row['BULBV']),
                    "curv" => floatval($row['CURV']),
                    "solv" => floatval($row['SOLV']),
                    "solc" => floatval($row['SOLC']),
                    "batv" => floatval($row['BATV']),
                    "batc" => floatval($row['BATC']),
                    "batsoc" => floatval($row['BATSOC']),
                    "date" => $row['DATE']
                );
            }
            
            return array("status" => "success", "data" => $result);
        } catch(PDOException $e) {
            return array("status" => "error", "message" => $e->getMessage());
        }
    }

    public function getMunicipalityStreetlights($municipality) {
        try {
            $query = "SELECT * FROM streetdata1 
                      WHERE SOCID LIKE CONCAT(?, '%') 
                      ORDER BY DATE DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$municipality]);
            
            $result = array();
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $result[] = array(
                    "socid" => $row['SOCID'],
                    "bulbv" => floatval($row['BULBV']),
                    "curv" => floatval($row['CURV']),
                    "solv" => floatval($row['SOLV']),
                    "solc" => floatval($row['SOLC']),
                    "batv" => floatval($row['BATV']),
                    "batc" => floatval($row['BATC']),
                    "batsoc" => floatval($row['BATSOC']),
                    "date" => $row['DATE']
                );
            }
            
            if (empty($result)) {
                return array(
                    "status" => "error",
                    "message" => "$municipality not found"
                );
            }
            
            return array(
                "status" => "success", 
                "data" => $result,
                "count" => count($result),
                "municipality" => $municipality
            );
        } catch(PDOException $e) {
            return array(
                "status" => "error", 
                "message" => $e->getMessage()
            );
        }
    }

    public function getBarangayStreetlights($municipality, $barangay) {
        try {
            $query = "SELECT * FROM streetdata1 
                      WHERE SOCID LIKE CONCAT(?, '-', ?, '%') 
                      ORDER BY DATE DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$municipality, $barangay]);
            
            $result = array();
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $result[] = array(
                    "socid" => $row['SOCID'],
                    "bulbv" => floatval($row['BULBV']),
                    "curv" => floatval($row['CURV']),
                    "solv" => floatval($row['SOLV']),
                    "solc" => floatval($row['SOLC']),
                    "batv" => floatval($row['BATV']),
                    "batc" => floatval($row['BATC']),
                    "batsoc" => floatval($row['BATSOC']),
                    "date" => $row['DATE']
                );
            }
            
            if (empty($result)) {
                return array(
                    "status" => "error",
                    "message" => "No streetlights found in $barangay"
                );
            }
            
            return array(
                "status" => "success", 
                "data" => $result,
            );
        } catch(PDOException $e) {
            return array(
                "status" => "error", 
                "message" => $e->getMessage()
            );
        }
    }
}
?>