<?php
// router.php

// Set default timezone
date_default_timezone_set('Asia/Kolkata');

// Helper to send json
function sendJson($statusCode, $data) {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Content-Type: application/json; charset=utf-8");
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    http_response_code(200);
    exit;
}

// Helper to process incoming weight payloads from any load cell / Raspberry Pi script
function processIncomingWeightPayload() {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    if (!is_array($input)) {
        $input = $_POST;
    }
    if (empty($input) && !empty($_GET)) {
        $input = $_GET;
    }

    $weight = 0.0;
    if (isset($input['weight'])) {
        $weight = floatval($input['weight']);
    } elseif (isset($input['Weight'])) {
        $weight = floatval($input['Weight']);
    } elseif (isset($input['net_weight'])) {
        $weight = floatval($input['net_weight']);
    } elseif (isset($input['gross_weight'])) {
        $weight = floatval($input['gross_weight']);
    }

    $mac = trim($input['mac_address'] ?? $input['mac'] ?? $input['device_id'] ?? $input['serial'] ?? 'LOAD-CELL-01');
    $location = trim($input['location'] ?? $input['device_name'] ?? 'Scale Counter');
    $unit = trim($input['unit'] ?? 'kg');
    $stable = isset($input['stable']) ? (bool)$input['stable'] : true;

    $liveFile = __DIR__ . '/data/live_weight.json';
    if (!file_exists(dirname($liveFile))) {
        mkdir(dirname($liveFile), 0777, true);
    }
    $liveData = [
        'mac' => $mac,
        'weight' => $weight,
        'unit' => $unit,
        'stable' => $stable,
        'location' => $location,
        'updated_at' => date('Y-m-d H:i:s')
    ];
    file_put_contents($liveFile, json_encode($liveData, JSON_PRETTY_PRINT));

    // Also append/update in weights.json history
    $dbFile = __DIR__ . '/data/weights.json';
    $logs = file_exists($dbFile) ? json_decode(file_get_contents($dbFile), true) : [];
    if (!is_array($logs)) $logs = [];
    
    $newLog = [
        'id' => uniqid(),
        'mac' => $mac,
        'weight' => $weight,
        'location' => $location,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    array_unshift($logs, $newLog);
    if (count($logs) > 200) $logs = array_slice($logs, 0, 200);
    file_put_contents($dbFile, json_encode($logs, JSON_PRETTY_PRINT));

    sendJson(200, [
        'status' => 'success',
        'message' => 'Weight processed successfully',
        'weight' => $weight,
        'unit' => $unit,
        'mac' => $mac,
        'updated_at' => $liveData['updated_at']
    ]);
}

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Handle Raspberry Pi / Load Cell API endpoints: /api/process-silo, /api_weight_indicator.php, /index1.php
if (strpos($path, '/api/process-silo') === 0 || strpos($path, '/api_weight_indicator') === 0 || strpos($path, '/index1.php') === 0) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['weight']) || isset($_GET['mac'])) {
        processIncomingWeightPayload();
    }
    // If GET without parameters, return live weight
    $liveFile = __DIR__ . '/data/live_weight.json';
    $liveData = file_exists($liveFile) ? json_decode(file_get_contents($liveFile), true) : ['weight' => 0.0, 'mac' => 'Scale'];
    sendJson(200, $liveData);
}

// Handle /pos.php when requested via POST by IoT script
if (($path === '/pos.php' || $path === '/pos') && $_SERVER['REQUEST_METHOD'] === 'POST') {
    processIncomingWeightPayload();
}

// Handle /api/live
if (strpos($path, '/api/live') === 0) {
    $liveFile = __DIR__ . '/data/live_weight.json';
    if (!file_exists(dirname($liveFile))) {
        mkdir(dirname($liveFile), 0777, true);
    }
    if (!file_exists($liveFile)) {
        file_put_contents($liveFile, json_encode([
            'mac' => '', 
            'weight' => 0.0, 
            'location' => 'Waiting for scale...',
            'updated_at' => date('Y-m-d H:i:s')
        ]));
    }

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // Support updating live weight via query string: ?mac=XX:XX:XX&weight=YY.YY&location=Location
        if (isset($_GET['mac']) && isset($_GET['weight'])) {
            $liveData = [
                'mac' => trim($_GET['mac']),
                'weight' => floatval($_GET['weight']),
                'location' => trim($_GET['location'] ?? 'Scale Device'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
            file_put_contents($liveFile, json_encode($liveData, JSON_PRETTY_PRINT));
            sendJson(200, $liveData);
        }

        $liveContent = file_get_contents($liveFile);
        $liveData = json_decode($liveContent, true);
        sendJson(200, $liveData);
    }

    if ($method === 'POST') {
        processIncomingWeightPayload();
    }

    sendJson(405, ['error' => 'Method Not Allowed']);
}

// Handle /api/weights and /api/weight requests
if (strpos($uri, '/api/weights') === 0 || strpos($uri, '/api/weight') === 0) {
    $dbFile = __DIR__ . '/data/weights.json';
    if (!file_exists(dirname($dbFile))) {
        mkdir(dirname($dbFile), 0777, true);
    }
    if (!file_exists($dbFile)) {
        file_put_contents($dbFile, json_encode([]));
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $dbContent = file_get_contents($dbFile);
    $logs = json_decode($dbContent, true);
    if (!is_array($logs)) {
        $logs = [];
    }

    if ($method === 'GET') {
        // Support saving/adding weight logs via GET query string: ?mac=XX:XX:XX&weight=YY.YY&location=Location
        if ((isset($_GET['mac']) || isset($_GET['mac_address'])) && isset($_GET['weight'])) {
            $newLog = [
                'id' => uniqid(),
                'mac' => trim($_GET['mac'] ?? $_GET['mac_address'] ?? ''),
                'weight' => floatval($_GET['weight']),
                'location' => trim($_GET['location'] ?? 'Modbus Scale'),
                'timestamp' => trim($_GET['timestamp'] ?? date('Y-m-d H:i:s'))
            ];

            if (empty($newLog['mac'])) {
                sendJson(400, ['error' => 'MAC Address is required.']);
            }
            if ($newLog['weight'] < 0) {
                sendJson(400, ['error' => 'Weight must be greater than or equal to 0.']);
            }

            // Deduplicate: Find existing record with same MAC address
            $foundKey = -1;
            foreach ($logs as $index => $log) {
                if (strcasecmp($log['mac'], $newLog['mac']) === 0) {
                    $foundKey = $index;
                    break;
                }
            }

            if ($foundKey !== -1) {
                $logs[$foundKey]['weight'] = $newLog['weight'];
                $logs[$foundKey]['location'] = $newLog['location'];
                $logs[$foundKey]['timestamp'] = $newLog['timestamp'];
                $newLog = $logs[$foundKey];
            } else {
                $logs[] = $newLog;
            }

            // Sort by timestamp descending
            usort($logs, function($a, $b) {
                return strcmp($b['timestamp'], $a['timestamp']);
            });

            file_put_contents($dbFile, json_encode($logs, JSON_PRETTY_PRINT));

            // Also update the live weight file so dashboard shows it live
            $liveFile = __DIR__ . '/data/live_weight.json';
            $liveData = [
                'mac' => $newLog['mac'],
                'weight' => $newLog['weight'],
                'location' => $newLog['location'],
                'updated_at' => date('Y-m-d H:i:s')
            ];
            file_put_contents($liveFile, json_encode($liveData, JSON_PRETTY_PRINT));

            sendJson(201, $newLog);
        }

        sendJson(200, $logs);
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if ($input) {
            $newLog = [
                'id' => uniqid(),
                'mac' => trim($input['mac'] ?? $input['mac_address'] ?? ''),
                'weight' => floatval($input['weight'] ?? 0),
                'location' => trim($input['location'] ?? 'Modbus Scale'),
                'timestamp' => trim($input['timestamp'] ?? date('Y-m-d H:i:s'))
            ];

            // Validate
            if (empty($newLog['mac'])) {
                sendJson(400, ['error' => 'MAC Address is required.']);
            }
            if ($newLog['weight'] < 0) {
                sendJson(400, ['error' => 'Weight must be greater than or equal to 0.']);
            }

            // Deduplicate: Find existing record with same MAC address
            $foundKey = -1;
            foreach ($logs as $index => $log) {
                if (strcasecmp($log['mac'], $newLog['mac']) === 0) {
                    $foundKey = $index;
                    break;
                }
            }

            if ($foundKey !== -1) {
                $logs[$foundKey]['weight'] = $newLog['weight'];
                $logs[$foundKey]['location'] = $newLog['location'];
                $logs[$foundKey]['timestamp'] = $newLog['timestamp'];
                $newLog = $logs[$foundKey];
            } else {
                $logs[] = $newLog;
            }

            // Sort by timestamp descending so newest is first in the list
            usort($logs, function($a, $b) {
                return strcmp($b['timestamp'], $a['timestamp']);
            });

            file_put_contents($dbFile, json_encode($logs, JSON_PRETTY_PRINT));

            // Also update the live weight file so dashboard shows it live
            $liveFile = __DIR__ . '/data/live_weight.json';
            $liveData = [
                'mac' => $newLog['mac'],
                'weight' => $newLog['weight'],
                'location' => $newLog['location'],
                'updated_at' => date('Y-m-d H:i:s')
            ];
            file_put_contents($liveFile, json_encode($liveData, JSON_PRETTY_PRINT));

            sendJson(201, $newLog);
        } else {
            sendJson(400, ['error' => 'Invalid JSON input']);
        }
    }

    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        if ($input && isset($input['id'])) {
            $found = false;
            $updatedLog = [];
            foreach ($logs as &$log) {
                if ($log['id'] === $input['id']) {
                    $log['mac'] = trim($input['mac'] ?? $log['mac']);
                    $log['weight'] = floatval($input['weight'] ?? $log['weight']);
                    $log['location'] = trim($input['location'] ?? $log['location'] ?? 'Warehouse Scale A');
                    $log['timestamp'] = trim($input['timestamp'] ?? $log['timestamp']);
                    
                    // Validate
                    if (empty($log['mac'])) {
                        sendJson(400, ['error' => 'MAC Address is required.']);
                    }
                    if ($log['weight'] < 0) {
                        sendJson(400, ['error' => 'Weight must be greater than or equal to 0.']);
                    }

                    $found = true;
                    $updatedLog = $log;
                    break;
                }
            }
            if ($found) {
                // Sort by timestamp descending
                usort($logs, function($a, $b) {
                    return strcmp($b['timestamp'], $a['timestamp']);
                });
                
                file_put_contents($dbFile, json_encode($logs, JSON_PRETTY_PRINT));
                sendJson(200, $updatedLog);
            } else {
                sendJson(404, ['error' => 'Log not found']);
            }
        } else {
            sendJson(400, ['error' => 'Invalid input or missing ID']);
        }
    }

    if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['id'] ?? null;
        }

        if ($id) {
            $found = false;
            $newLogs = [];
            foreach ($logs as $log) {
                if ($log['id'] === $id) {
                    $found = true;
                } else {
                    $newLogs[] = $log;
                }
            }
            if ($found) {
                file_put_contents($dbFile, json_encode($newLogs, JSON_PRETTY_PRINT));
                sendJson(200, ['success' => true, 'id' => $id]);
            } else {
                sendJson(404, ['error' => 'Log not found']);
            }
        } else {
            sendJson(400, ['error' => 'Missing ID parameter']);
        }
    }

    sendJson(405, ['error' => 'Method Not Allowed']);
}

// Extract path
$parsedUrl = parse_url($uri);
$path = $parsedUrl['path'];

// Check if request is for index.php, index.html or root
if ($path === '/' || $path === '/index.php' || $path === '/index.html') {
    require __DIR__ . '/index.php';
    exit;
}

// Check if request is for pos or pos.php
if ($path === '/pos' || $path === '/pos.php') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        processIncomingWeightPayload();
    }
    require __DIR__ . '/pos.php';
    exit;
}

// Check if request is for public or public/index.php
if ($path === '/public' || $path === '/public/' || $path === '/public/index.php' || $path === '/public/index.html') {
    require __DIR__ . '/public/index.php';
    exit;
}

// Serve public static assets or root static assets
$candidateFiles = [
    __DIR__ . $path,
    __DIR__ . '/public' . $path
];

foreach ($candidateFiles as $file) {
    if (file_exists($file) && is_file($file)) {
        $ext = pathinfo($file, PATHINFO_EXTENSION);
        if ($ext === 'php') {
            require $file;
            exit;
        }
        $mimeTypes = [
            'css'  => 'text/css; charset=utf-8',
            'js'   => 'application/javascript; charset=utf-8',
            'json' => 'application/json; charset=utf-8',
            'png'  => 'image/png',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif'  => 'image/gif',
            'svg'  => 'image/svg+xml',
            'ico'  => 'image/x-icon'
        ];
        $contentType = $mimeTypes[$ext] ?? 'application/octet-stream';
        header("Content-Type: $contentType");
        readfile($file);
        exit;
    }
}

// If file not found
http_response_code(404);
echo "404 Not Found";
exit;
