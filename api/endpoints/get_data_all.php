<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../controllers/StreetlightsController.php';

$database = new Database();
$db = $database->getConnection();
$controller = new StreetlightController($db);

$result = $controller->getStreetlights();
echo json_encode($result);
?>