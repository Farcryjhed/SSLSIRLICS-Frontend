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

    public function getStreetlightDetails($socid) {
        try {
            if (!$socid) {
                throw new Exception('SOCID is required');
            }
            
            $stmt = $this->conn->prepare("
                SELECT * FROM streetdata1 
                WHERE SOCID = :socid 
                AND DATE >= NOW() - INTERVAL 24 HOUR 
                ORDER BY DATE DESC
            ");
            
            $stmt->bindParam(':socid', $socid, PDO::PARAM_STR);
            $stmt->execute();
            
            $readings = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $readings[] = [
                    'socid' => $row['SOCID'],
                    'bulbv' => $row['BULBV'],
                    'curv' => $row['CURV'],
                    'solv' => $row['SOLV'],
                    'solc' => $row['SOLC'],
                    'batv' => $row['BATV'],
                    'batc' => $row['BATC'],
                    'batsoc' => $row['BATSOC'],
                    'date' => $row['DATE']
                ];
            }

            return [
                'status' => 'success',
                'data' => $readings
            ];

        } catch(Exception $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage()
            ];
        }
    }

    public function getStreetlightCount($pattern) {
        try {
            if (!$pattern) {
                throw new Exception('Pattern is required');
            }

            // Check if it's municipality level (3 chars) or barangay level (6 chars)
            $isBarangay = strlen($pattern) === 6;
            $isMunicipality = strlen($pattern) === 3;

            if (!$isBarangay && !$isMunicipality) {
                throw new Exception('Invalid pattern length. Must be 3 (municipality) or 6 (barangay) characters');
            }

            $query = "SELECT DISTINCT SOCID, MAX(DATE) as latest_reading, MAX(BATSOC) as battery_level 
                     FROM streetdata1 
                     WHERE SOCID LIKE :pattern 
                     GROUP BY SOCID";

            $stmt = $this->conn->prepare($query);
            
            // For municipality: CAR-% matches all in CAR
            // For barangay: CAR-GOS% matches all in GOS barangay
            $searchPattern = $isBarangay ? 
                            substr($pattern, 0, 3) . '-' . substr($pattern, 3) . '%' : 
                            $pattern . '-%';
            
            $stmt->bindValue(':pattern', $searchPattern, PDO::PARAM_STR);
            $stmt->execute();

            $streetlights = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Count active/inactive based on battery level
            $activeCount = 0;
            $inactiveCount = 0;

            foreach ($streetlights as $light) {
                if (floatval($light['battery_level']) > 20.0) {
                    $activeCount++;
                } else {
                    $inactiveCount++;
                }
            }

            return [
                'status' => 'success',
                'data' => [
                    'total' => count($streetlights),
                    'active' => $activeCount,
                    'inactive' => $inactiveCount,
                    'level' => $isBarangay ? 'barangay' : 'municipality',
                    'code' => $pattern
                ]
            ];

        } catch(Exception $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage()
            ];
        }
    }
}
?>