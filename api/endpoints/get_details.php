<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $socid = $_GET['socid'] ?? null;
    if (!$socid) {
        throw new Exception('SOCID is required');
    }

    // Create database instance
    $database = new Database();
    $conn = $database->getConnection();
    
    // Get last 24 hours of readings
    $stmt = $conn->prepare("
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

    echo json_encode([
        'status' => 'success',
        'data' => $readings
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>