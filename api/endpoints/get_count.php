<?php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../controllers/StreetlightsController.php';

try {
    $pattern = $_GET['pattern'] ?? null;
    
    $database = new Database();
    $controller = new StreetlightController($database->getConnection());
    
    $result = $controller->getStreetlightCount($pattern);
    
    if ($result['status'] === 'error') {
        http_response_code(500);
    }
    
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}