-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Feb 26, 2025 at 06:19 AM
-- Server version: 8.0.30
-- PHP Version: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sslsirlics_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `streetdata1`
--

CREATE TABLE `streetdata1` (
  `SOCID` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `BULBV` float NOT NULL,
  `CURV` float NOT NULL,
  `SOLV` float NOT NULL,
  `SOLC` float NOT NULL,
  `BATV` float NOT NULL,
  `BATC` float NOT NULL,
  `BATSOC` float NOT NULL,
  `DATE` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `streetdata1`
--

INSERT INTO `streetdata1` (`SOCID`, `BULBV`, `CURV`, `SOLV`, `SOLC`, `BATV`, `BATC`, `BATSOC`, `DATE`) VALUES
('BTU-LIB001', 12.5, 0.8, 19.2, 1.2, 12.8, 0.5, 85.5, '2025-02-19 18:00:00'),
('BTU-LIB002', 12.3, 0.7, 19.1, 1.1, 12.6, 0.4, 83.2, '2025-02-19 18:00:00'),
('BTU-DBF001', 12.4, 0.8, 19.3, 1.2, 12.7, 0.5, 87.8, '2025-02-19 18:00:00'),
('BTU-DBF002', 12.6, 0.9, 19.4, 1.3, 12.9, 0.6, 89.4, '2025-02-19 18:00:00'),
('BTU-BAN001', 12.5, 0.8, 19.2, 1.2, 12.8, 0.5, 86.5, '2025-02-19 18:00:00'),
('BTU-BAN002', 12.4, 0.7, 19.1, 1.1, 12.7, 0.4, 84.3, '2025-02-19 18:00:00'),
('BTU-BON001', 12.3, 0.8, 19.3, 1.2, 12.6, 0.5, 85.7, '2025-02-19 18:00:00'),
('BTU-BON002', 12.5, 0.9, 19.4, 1.3, 12.8, 0.6, 88.9, '2025-02-19 18:00:00'),
('SUR-LUN001', 12.4, 0.8, 19.2, 1.2, 12.7, 0.5, 86.4, '2025-02-19 18:00:00'),
('SUR-LUN002', 12.6, 0.9, 19.3, 1.3, 12.9, 0.6, 89.2, '2025-02-19 18:00:00'),
('SUR-WAW001', 12.3, 0.7, 19.1, 1.1, 12.6, 0.4, 84.5, '2025-02-19 18:00:00'),
('SUR-WAW002', 12.5, 0.8, 19.2, 1.2, 12.8, 0.5, 87.3, '2025-02-19 18:00:00'),
('SUR-TIN001', 12.4, 0.8, 19.3, 1.2, 12.7, 0.5, 85.8, '2025-02-19 18:00:00'),
('SUR-TIN002', 12.6, 0.9, 19.4, 1.3, 12.9, 0.6, 88.6, '2025-02-19 18:00:00'),
('SUR-CAN001', 12.5, 0.8, 19.2, 1.2, 12.8, 0.5, 86.9, '2025-02-19 18:00:00'),
('SUR-CAN002', 12.4, 0.7, 19.1, 1.1, 12.7, 0.4, 85.1, '2025-02-19 18:00:00'),
('BTU-LIB001', 12.2, 0.9, 0, 0, 12.5, -0.5, 80.5, '2025-02-19 23:00:00'),
('BTU-DBF001', 12.1, 0.8, 0, 0, 12.4, -0.4, 79.8, '2025-02-19 23:00:00'),
('BTU-BAN001', 12.3, 0.9, 0, 0, 12.6, -0.5, 81.7, '2025-02-19 23:00:00'),
('BTU-BON001', 12.2, 0.8, 0, 0, 12.5, -0.4, 80.9, '2025-02-19 23:00:00'),
('SUR-LUN001', 12.1, 0.8, 0, 0, 12.4, -0.4, 81.4, '2025-02-19 23:00:00'),
('SUR-WAW001', 12.2, 0.9, 0, 0, 12.5, -0.5, 79.5, '2025-02-19 23:00:00'),
('SUR-TIN001', 12.3, 0.8, 0, 0, 12.6, -0.4, 80.8, '2025-02-19 23:00:00'),
('SUR-CAN001', 12.2, 0.9, 0, 0, 12.5, -0.5, 81.9, '2025-02-19 23:00:00');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
