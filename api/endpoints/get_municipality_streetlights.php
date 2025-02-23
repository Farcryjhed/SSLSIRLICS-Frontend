<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../controllers/StreetlightsController.php';

$database = new Database();
$db = $database->getConnection();
$controller = new StreetlightController($db);

// Get municipality code from URL parameter (e.g., BTU, SUR)
$municipality = isset($_GET['municipality']) ? $_GET['municipality'] : '';

if (empty($municipality)) {
    echo json_encode(array(
        "status" => "error",
        "message" => "Municipality parameter is required"
    ));
    exit;
}

$result = $controller->getMunicipalityStreetlights($municipality);
echo json_encode($result);
?>