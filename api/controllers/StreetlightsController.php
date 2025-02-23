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
}
?>