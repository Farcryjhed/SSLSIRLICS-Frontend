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

            // Split pattern to check if it's a full pattern or just municipality code
            $parts = explode('-', $pattern);
            
            // Determine search pattern based on input
            if (count($parts) === 3) {
                // Full pattern: PROVINCE-MUNICIPALITY-BARANGAY (e.g., ADU-BTU-AM1)
                $searchPattern = $pattern . '%';
            } elseif (count($parts) === 2) {
                // Province and municipality only (e.g., ADU-BTU)
                $searchPattern = $pattern . '-%';
            } elseif (strlen($pattern) === 3) {
                // Just municipality code - search across all provinces
                $searchPattern = '%-' . $pattern . '-%';
            } else {
                throw new Exception('Invalid pattern format. Expected: PROVINCE-MUNICIPALITY[-BARANGAY]');
            }

            // Modified query to handle pattern matching more effectively
            $query = "WITH LatestReadings AS (
                SELECT SOCID, MAX(DATE) as max_date
                FROM streetdata1 
                WHERE SOCID LIKE :pattern
                GROUP BY SOCID
            )
            SELECT s.*
            FROM streetdata1 s
            INNER JOIN LatestReadings lr ON s.SOCID = lr.SOCID AND s.DATE = lr.max_date
            WHERE s.SOCID LIKE :pattern";

            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':pattern', $searchPattern, PDO::PARAM_STR);
            $stmt->execute();

            $total = 0;
            $active = 0;
            $inactive = 0;

            // Add debug logging
            error_log("Search Pattern: " . $searchPattern);

            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $total++;
                // Changed from battery_level to BATSOC
                if (floatval($row['BATSOC']) > 20.0) {
                    $active++;
                } else {
                    $inactive++;
                }
            }

            // Return counts with pattern info
            return array(
                "status" => "success",
                "data" => array(
                    "total" => $total,
                    "active" => $active,
                    "inactive" => $inactive
                ),
                "pattern" => $pattern,
                "search_pattern" => $searchPattern
            );

        } catch(Exception $e) {
            error_log("Error in getStreetlightCount: " . $e->getMessage());
            return array(
                "status" => "error",
                "message" => $e->getMessage()
            );
        }
    }
}
?>