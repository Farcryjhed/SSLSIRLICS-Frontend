<?php
header('Content-Type: application/json');

try {
    // Get SOCID from request
    $socid = isset($_GET['socid']) ? $_GET['socid'] : null;

    if (!$socid) {
        throw new Exception('SOCID is required');
    }

    // Database connection
    $conn = new mysqli("localhost", "root", "", "sslsirlics_db");
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }

    // Prepare and execute query
    $stmt = $conn->prepare("SELECT * FROM streetdata1 WHERE SOCID = ? ORDER BY DATE DESC LIMIT 1");
    $stmt->bind_param("s", $socid);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $streetlight = $result->fetch_assoc();
        echo json_encode([
            'status' => 'success',
            'data' => [
                'socid' => $streetlight['SOCID'],
                'bulbv' => $streetlight['BULBV'],
                'curv' => $streetlight['CURV'],
                'solv' => $streetlight['SOLV'],
                'solc' => $streetlight['SOLC'],
                'batv' => $streetlight['BATV'],
                'batc' => $streetlight['BATC'],
                'batsoc' => $streetlight['BATSOC'],
                'date' => $streetlight['DATE']
            ]
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Streetlight not found'
        ]);
    }

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>