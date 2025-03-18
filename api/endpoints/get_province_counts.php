<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once '../config/database.php';
require_once '../controllers/StreetlightsController.php';

try {
    $db = new Database();
    $controller = new StreetlightController($db->getConnection());
    
    $result = $controller->getProvinceCount();
    echo json_encode($result);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}