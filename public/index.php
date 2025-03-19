<?php
session_start();

// Set the root directory
define('ROOT_DIR', dirname(__DIR__));

// Include necessary files
require_once ROOT_DIR . '/api/config/database.php';
require_once ROOT_DIR . '/models/User.php';
require_once ROOT_DIR . '/controllers/AuthController.php';

// Initialize database connection
$database = new Database();
$db = $database->getConnection();
$auth = new AuthController($db);

// Basic routing
$action = $_SERVER['REQUEST_METHOD'] === 'POST' ? 'login' : 'showLoginForm';

switch ($action) {
    case 'login':
        $result = $auth->login();
        if(isset($result['error'])) {
            $error = $result['error'];
            require_once ROOT_DIR . '/views/auth/login.php';
        }
        break;
    
    default:
        require_once ROOT_DIR . '../views/login.php';
        break;
}