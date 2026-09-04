<?php
/**
 * scale_reader.php - PHP Modbus & Scale Telemetry Sender for Raspberry Pi / Devices
 * 
 * Usage:
 *   php scale_reader.php
 */

// ============================================================
// CONFIGURATION
// ============================================================

// Replace with your server IP if running on a separate machine (e.g. "http://192.168.4.228:5000/api/weights")
$apiUrl = "http://127.0.0.1:5000/api/weights";

// Interval between telemetry transmissions (in seconds)
$sendInterval = 1; // 1 second for live real-time responsiveness

// Device Location Description
$deviceLocation = "Raspberry Pi Scale (PHP Edition)";

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Automatically determine Device MAC address on Linux/Raspberry Pi or Windows
 */
function getDeviceMac() {
    // Try Linux sysfs first (Raspberry Pi eth0 or wlan0)
    $interfaces = ['wlan0', 'eth0', 'en0'];
    foreach ($interfaces as $iface) {
        $path = "/sys/class/net/{$iface}/address";
        if (file_exists($path)) {
            $mac = trim(file_get_contents($path));
            if (!empty($mac)) {
                return strtoupper(str_replace(':', '-', $mac));
            }
        }
    }
    
    // Fallback using getmac or shell
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        @exec('getmac', $output);
        foreach ($output as $line) {
            if (preg_match('/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/', $line, $matches)) {
                return strtoupper(str_replace(':', '-', $matches[0]));
            }
        }
    } else {
        @exec('cat /sys/class/net/*/address 2>/dev/null', $output);
        if (!empty($output[0])) {
            return strtoupper(str_replace(':', '-', trim($output[0])));
        }
    }
    
    return "88-A2-9E-4A-9D-2A";
}

/**
 * Send weight telemetry reading to the PHP API
 */
function sendToApi($url, $mac, $weight, $location) {
    $payload = json_encode([
        'mac' => $mac,
        'weight' => floatval($weight),
        'location' => $location,
        'timestamp' => date('Y-m-d H:i:s')
    ]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($payload)
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 4);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        echo "[ERROR] API request failed: {$error}\n";
        return false;
    }

    echo "[SUCCESS] Sent: MAC={$mac}, Weight={$weight} kg, HTTP Status={$httpCode}\n";
    if ($response) {
        echo "          Response: {$response}\n";
    }
    return true;
}

// ============================================================
// MAIN LOOP
// ============================================================

$deviceMac = getDeviceMac();
echo "=====================================================\n";
echo " Starting PHP Weighing Scale Telemetry Sender\n";
echo " Device MAC    : {$deviceMac}\n";
echo " Target API    : {$apiUrl}\n";
echo " Send Interval : {$sendInterval}s\n";
echo " Press Ctrl+C to stop.\n";
echo "=====================================================\n\n";

// Loop and send
while (true) {
    // Read weight from indicator/serial port or simulator
    // In production, integrate with fopen('/dev/ttyUSB0', 'r') or php-modbus
    $simulatedWeight = 0; // Replace with actual serial indicator reading
    
    // Example: If reading from serial
    // $weight = readSerialIndicator('/dev/ttyUSB0');
    
    sendToApi($apiUrl, $deviceMac, $simulatedWeight, $deviceLocation);
    
    sleep($sendInterval);
}
