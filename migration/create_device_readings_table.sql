CREATE TABLE device_readings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    SOCid VARCHAR(50) NOT NULL,
    BULBV DECIMAL(10, 2) NOT NULL,
    CURV DECIMAL(10, 2) NOT NULL,
    SOLV DECIMAL(10, 2) NOT NULL,
    SOLC DECIMAL(10, 2) NOT NULL,
    BATV DECIMAL(10, 2) NOT NULL,
    BATC DECIMAL(10, 2) NOT NULL,
    BATSOC DECIMAL(10, 2) NOT NULL,
    DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SOCid) REFERENCES devices(SOCid) ON DELETE CASCADE,
    INDEX idx_socid (SOCid),
    INDEX idx_date (DATE)
);