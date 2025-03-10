-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 10, 2025 at 03:14 PM
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
('BTU-AM1001', 12.5, 0.8, 19.2, 1.2, 12.8, 0.5, 85.5, '2025-02-19 18:00:00'),
('BTU-AMP002', 12.3, 0.7, 19.1, 1.1, 12.6, 0.4, 83.2, '2025-02-19 18:00:00'),
('CAR-GOS001', 12.3, 0.8, 19.3, 1.2, 12.6, 0.5, 85.7, '2025-02-19 18:00:00'),
('CAR-MAN002', 12.5, 0.9, 19.4, 1.3, 12.8, 0.6, 88.9, '2025-02-19 18:00:00'),

-- Morning readings
('BTU-AM1001', 0.2, 0.0, 18.5, 2.1, 13.2, 1.8, 90.5, '2025-03-10 08:00:00'),
('BTU-AMP002', 0.1, 0.0, 18.3, 2.0, 13.0, 1.7, 88.2, '2025-03-10 08:00:00'),
('CAR-GOS001', 0.2, 0.0, 18.6, 2.2, 13.1, 1.9, 89.7, '2025-03-10 08:00:00'),
('CAR-MAN002', 0.1, 0.0, 18.4, 2.1, 13.0, 1.8, 87.9, '2025-03-10 08:00:00'),

-- Afternoon readings
('BTU-AM1001', 0.0, 0.0, 19.8, 2.5, 13.5, 2.1, 95.5, '2025-03-10 14:00:00'),
('BTU-AMP002', 0.0, 0.0, 19.6, 2.4, 13.4, 2.0, 94.2, '2025-03-10 14:00:00'),
('CAR-GOS001', 0.0, 0.0, 19.7, 2.6, 13.6, 2.2, 96.7, '2025-03-10 14:00:00'),
('CAR-MAN002', 0.0, 0.0, 19.5, 2.3, 13.3, 1.9, 93.9, '2025-03-10 14:00:00'),

-- Evening readings (lights on)
('BTU-AM1001', 12.8, 0.9, 5.2, 0.1, 12.9, -0.8, 82.5, '2025-03-10 19:00:00'),
('BTU-AMP002', 12.6, 0.8, 5.0, 0.1, 12.7, -0.7, 80.2, '2025-03-10 19:00:00'),
('CAR-GOS001', 12.7, 0.9, 5.1, 0.1, 12.8, -0.8, 81.7, '2025-03-10 19:00:00'),
('CAR-MAN002', 12.5, 0.8, 5.0, 0.1, 12.6, -0.7, 79.9, '2025-03-10 19:00:00'),

-- Late night readings
('BTU-AM1001', 12.5, 0.8, 0.0, 0.0, 12.4, -0.7, 75.5, '2025-03-10 23:00:00'),
('BTU-AMP002', 12.3, 0.7, 0.0, 0.0, 12.2, -0.6, 73.2, '2025-03-10 23:00:00'),
('CAR-GOS001', 12.4, 0.8, 0.0, 0.0, 12.3, -0.7, 74.7, '2025-03-10 23:00:00'),
('CAR-MAN002', 12.2, 0.7, 0.0, 0.0, 12.1, -0.6, 72.9, '2025-03-10 23:00:00'),

-- Some problematic readings (low battery)
('BTU-AM1001', 10.5, 0.5, 0.0, 0.0, 11.2, -0.4, 15.5, '2025-03-09 03:00:00'),
('BTU-AMP002', 0.0, 0.0, 18.5, 1.8, 11.0, 1.5, 18.2, '2025-03-09 10:00:00'),
('CAR-GOS001', 9.8, 0.4, 0.0, 0.0, 11.1, -0.3, 12.7, '2025-03-09 02:00:00'),
('CAR-MAN002', 0.0, 0.0, 18.2, 1.7, 11.3, 1.4, 19.9, '2025-03-09 11:00:00'),

-- Recovery readings
('BTU-AM1001', 0.0, 0.0, 19.2, 2.4, 12.8, 2.0, 45.5, '2025-03-09 14:00:00'),
('BTU-AMP002', 0.0, 0.0, 19.0, 2.3, 12.6, 1.9, 48.2, '2025-03-09 15:00:00'),
('CAR-GOS001', 0.0, 0.0, 19.1, 2.4, 12.7, 2.0, 52.7, '2025-03-09 14:30:00'),
('CAR-MAN002', 0.0, 0.0, 18.9, 2.2, 12.5, 1.8, 55.9, '2025-03-09 15:30:00');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
