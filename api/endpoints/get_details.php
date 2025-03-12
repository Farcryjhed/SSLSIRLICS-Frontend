<?php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../controllers/StreetlightsController.php';

try {
    $socid = $_GET['socid'] ?? null;
    
    $database = new Database();
    $controller = new StreetlightController($database->getConnection());
    
    $result = $controller->getStreetlightDetails($socid);
    
    if ($result['status'] === 'error') {
        http_response_code(500);
    }
    
    echo json_encode($result,);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>