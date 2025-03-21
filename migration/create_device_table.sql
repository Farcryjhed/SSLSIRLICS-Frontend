CREATE TABLE devices (
    SOCid VARCHAR(50) PRIMARY KEY,
    SOCadd VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    `long` DECIMAL(11, 8) NOT NULL,
    date_installed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);