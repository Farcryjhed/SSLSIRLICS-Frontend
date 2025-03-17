<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once '../config/database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();

    // Get latest reading for each SOCID first, then count by province
    $sql = "WITH LatestReadings AS (
                SELECT socid, date
                FROM streetdata1
                WHERE (socid, date) IN (
                    SELECT socid, MAX(date)
                    FROM streetdata1
                    GROUP BY socid
                )
            )
            SELECT 
                SUBSTRING(lr.socid, 1, 3) as province_code,
                COUNT(*) as count
            FROM LatestReadings lr
            GROUP BY SUBSTRING(lr.socid, 1, 3)
            WITH ROLLUP";

    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $response = [
        'status' => 'success',
        'data' => [
            'provinces' => [],
            'total' => 0
        ]
    ];

    foreach ($results as $row) {
        if ($row['province_code'] === null) {
            $response['data']['total'] = (int)$row['count'];
        } else {
            $response['data']['provinces'][] = [
                'code' => $row['province_code'],
                'count' => (int)$row['count']
            ];
        }
    }

    echo json_encode($response);

} catch (PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}