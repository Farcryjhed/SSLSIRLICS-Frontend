<?php
class AuthController {
    private $userModel;
    
    public function __construct($db) {
        $this->userModel = new User($db);
    }
    
    public function login() {
        if($_SERVER['REQUEST_METHOD'] == 'POST') {
            // Use htmlspecialchars instead of deprecated FILTER_SANITIZE_STRING
            $username = htmlspecialchars(trim($_POST['username'] ?? ''), ENT_QUOTES, 'UTF-8');
            $password = $_POST['password'] ?? '';
            
            if(empty($username) || empty($password)) {
                return ['error' => 'Username and password are required'];
            }
            
            $user = $this->userModel->login($username, $password);
            
            if($user) {
                session_start();
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                header('Location: ../views/dashboard.php');
                exit();
            } else {
                return ['error' => 'Invalid username or password'];
            }
        }
        return [];
    }
    
    public function logout() {
        session_start();
        session_destroy();
        header('Location: index.html'); # Balik sa map
        exit();
    }
}