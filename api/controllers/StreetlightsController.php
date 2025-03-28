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
            
            // Log the request for debugging
            error_log("Fetching details for SOCID: " . $socid);
            
            // First try with the 24 hour limit
            $stmt = $this->conn->prepare("
                SELECT * FROM streetdata1 
                WHERE SOCID = :socid 
                AND DATE >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
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
            
            // If no results found in last 24 hours, get the most recent readings instead
            if (empty($readings)) {
                error_log("No data found in last 24 hours for SOCID: " . $socid . ". Fetching most recent data instead.");
                
                $stmt = $this->conn->prepare("
                    SELECT * FROM streetdata1 
                    WHERE SOCID = :socid 
                    ORDER BY DATE DESC
                    LIMIT 10
                ");
                
                $stmt->bindParam(':socid', $socid, PDO::PARAM_STR);
                $stmt->execute();
                
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
                
                // If still no results, check if the SOCID exists at all
                if (empty($readings)) {
                    $stmt = $this->conn->prepare("
                        SELECT COUNT(*) as count FROM streetdata1 WHERE SOCID = :socid
                    ");
                    $stmt->bindParam(':socid', $socid, PDO::PARAM_STR);
                    $stmt->execute();
                    $result = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($result['count'] == 0) {
                        error_log("SOCID not found in database: " . $socid);
                        return [
                            'status' => 'error',
                            'message' => 'Streetlight not found with SOCID: ' . $socid
                        ];
                    } else {
                        error_log("SOCID exists but no readings available: " . $socid);
                        return [
                            'status' => 'error',
                            'message' => 'No readings available for this streetlight'
                        ];
                    }
                }
            }

            error_log("Found " . count($readings) . " readings for SOCID: " . $socid);
            return [
                'status' => 'success',
                'data' => $readings
            ];

        } catch(Exception $e) {
            error_log("Error in getStreetlightDetails: " . $e->getMessage());
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

    public function getProvinceCount() {
        try {
            // Get latest reading for each SOCID first, then count by province
            $sql = "WITH LatestReadings AS (
                        SELECT socid, date
                        FROM streetdata1
                        WHERE (socid, date) IN (
                            SELECT socid, MAX(date)
                            FROM streetdata1
                            GROUP BY socid
                        )
                    )
                    SELECT 
                        SUBSTRING(lr.socid, 1, 3) as province_code,
                        COUNT(*) as count
                    FROM LatestReadings lr
                    GROUP BY SUBSTRING(lr.socid, 1, 3)
                    WITH ROLLUP";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response = [
                'status' => 'success',
                'data' => [
                    'provinces' => [],
                    'total' => 0
                ]
            ];

            foreach ($results as $row) {
                if ($row['province_code'] === null) {
                    $response['data']['total'] = (int)$row['count'];
                } else {
                    $response['data']['provinces'][] = [
                        'code' => $row['province_code'],
                        'count' => (int)$row['count']
                    ];
                }
            }

            return $response;

        } catch(Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Server error: ' . $e->getMessage()
            ];
        }
    }
}
?>