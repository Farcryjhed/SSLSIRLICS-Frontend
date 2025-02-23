<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../controllers/StreetlightsController.php';

$database = new Database();
$db = $database->getConnection();
$controller = new StreetlightController($db);

// Get parameters from URL
$municipality = isset($_GET['municipality']) ? $_GET['municipality'] : '';
$barangay = isset($_GET['barangay']) ? $_GET['barangay'] : '';

if (empty($municipality) || empty($barangay)) {
    echo json_encode(array(
        "status" => "error",
        "message" => "Both municipality and barangay parameters are required"
    ));
    exit;
}

$result = $controller->getBarangayStreetlights($municipality, $barangay);
echo json_encode($result);
?>