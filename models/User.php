<?php
class User {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }

    public function login($username, $password) {
        try {
            $query = "SELECT * FROM users WHERE username = :username";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':username', $username, PDO::PARAM_STR);
            $stmt->execute();
            
            if($user = $stmt->fetch(PDO::FETCH_ASSOC)) {
                if(password_verify($password, $user['password'])) {
                    return $user;
                }
            }
            return false;
        } catch(PDOException $e) {
            error_log("Login error: " . $e->getMessage());
            return false;
        }
    }
}