<?php
// index.php - Sunfra Weight & Scale Monitoring Dashboard (PHP Server-Side & Live Client)
date_default_timezone_set('Asia/Kolkata');

// Load Data from JSON files
$dbFile = __DIR__ . '/data/weights.json';
$liveFile = __DIR__ . '/data/live_weight.json';

// Initialize files if not present
if (!file_exists(dirname($dbFile))) {
    mkdir(dirname($dbFile), 0777, true);
}
if (!file_exists($dbFile)) {
    file_put_contents($dbFile, json_encode([]));
}
if (!file_exists($liveFile)) {
    file_put_contents($liveFile, json_encode([
        'mac' => '',
        'weight' => 0.0,
        'location' => 'Waiting for scale...',
        'updated_at' => date('Y-m-d H:i:s')
    ]));
}

// Read database
$logs = json_decode(file_get_contents($dbFile), true) ?: [];
$liveData = json_decode(file_get_contents($liveFile), true) ?: [
    'mac' => '',
    'weight' => 0.0,
    'location' => 'Waiting for scale...',
    'updated_at' => date('Y-m-d H:i:s')
];

// Calculate Initial Stats in PHP
$uniqueMacs = [];
$overweightCount = 0;
$now = time();
$activeCount = 0;

foreach ($logs as $log) {
    $macUpper = strtoupper($log['mac']);
    $uniqueMacs[$macUpper] = true;
    
    if (floatval($log['weight']) > 100.0) {
        $overweightCount++;
    }
    
    $logTime = strtotime($log['timestamp']);
    if ($logTime && ($now - $logTime) <= 300) {
        $activeCount++;
    }
}
$totalDevices = count($uniqueMacs);
if ($activeCount === 0 && $totalDevices > 0) {
    $activeCount = $totalDevices;
}

// Live weight calculation
$liveWeight = floatval($liveData['weight'] ?? 0);
$liveUpdateSec = $now - strtotime($liveData['updated_at'] ?? '2000-01-01');
$isLiveActive = ($liveUpdateSec <= 10 && $liveWeight > 0);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Sunfra Weight & Scale Monitoring Dashboard. Real-time telemetry, load cell logging and filters in PHP.">
    <title>Sunfra Weight & Scale Monitoring</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- FontAwesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- CSS Style -->
    <link rel="stylesheet" href="public/style.css">
</head>
<body>
    <div class="app-container">
        
        <!-- Header -->
        <header class="app-header main-card">
            <div class="header-left">
                <div class="logo-box">
                    <i class="fa-solid fa-weight-scale logo-icon"></i>
                </div>
                <div class="title-block">
                    <h1>Sunfra Weight & Scale Monitoring</h1>
                    <p>Real-Time Scale Device Telemetry & Automatic Data Recording System (PHP Edition)</p>
                </div>
            </div>
            <div class="header-right">
                <div class="time-pill">
                    <span class="live-pulse"></span>
                    <span id="current-time"><?php echo date('d/m/Y, H:i:s'); ?></span>
                </div>
                <a href="pos.php" class="btn btn-secondary" style="text-decoration:none;">
                    <i class="fa-solid fa-camera"></i> POS Terminal
                </a>
                <button class="btn btn-primary" id="open-add-btn">
                    <i class="fa-solid fa-plus"></i> Add Scale
                </button>
            </div>
        </header>

        <!-- Filters Section -->
        <section class="filters-section main-card">
            <div class="filters-header">
                <h2><i class="fa-solid fa-sliders"></i> Customization & Monitoring Filters</h2>
                <span class="helper-note">Filter by custom Date/Time range or view a particular MAC Address</span>
            </div>
            <div class="filters-grid">
                <div class="filter-group">
                    <label>FILTER DATE & TIME (FROM)</label>
                    <div class="input-container">
                        <input type="datetime-local" id="filter-from">
                    </div>
                </div>
                <div class="filter-group">
                    <label>FILTER DATE & TIME (TO)</label>
                    <div class="input-container">
                        <input type="datetime-local" id="filter-to">
                    </div>
                </div>
                <div class="filter-group">
                    <label>MAC ADDRESS FILTER</label>
                    <div class="input-container">
                        <select id="filter-mac">
                            <option value="">All MAC Addresses</option>
                            <?php foreach (array_keys($uniqueMacs) as $mac): ?>
                                <option value="<?php echo htmlspecialchars($mac); ?>"><?php echo htmlspecialchars($mac); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
            </div>
            <div class="filters-actions">
                <button class="btn btn-primary" id="apply-filters-btn">
                    <span class="dot-icon"></span> Apply Filter
                </button>
                <button class="btn btn-secondary" id="reset-filters-btn">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
            </div>
        </section>

        <!-- Stats Row -->
        <section class="stats-row">
            <!-- Card 1 -->
            <div class="stat-card blue">
                <div class="stat-content">
                    <h3>TOTAL MONITORED DEVICES</h3>
                    <p id="stat-total"><?php echo $totalDevices; ?></p>
                </div>
                <div class="stat-icon">
                    <i class="fa-solid fa-weight-scale"></i>
                </div>
            </div>
            <!-- Card 2 -->
            <div class="stat-card green">
                <div class="stat-content">
                    <h3>DEVICES POWER ON</h3>
                    <p id="stat-active"><?php echo $activeCount; ?></p>
                </div>
                <div class="stat-icon">
                    <i class="fa-solid fa-bolt"></i>
                </div>
            </div>
            <!-- Card 3 -->
            <div class="stat-card red">
                <div class="stat-content">
                    <h3>OVERWEIGHT ALERTS (&gt;100kg)</h3>
                    <p id="stat-alerts"><?php echo $overweightCount; ?></p>
                </div>
                <div class="stat-icon">
                    <i class="fa-solid fa-circle"></i>
                </div>
            </div>
            <!-- Card 4 -->
            <div class="stat-card orange" <?php if ($isLiveActive) echo 'style="box-shadow: 0 0 10px rgba(253, 126, 20, 0.2);"'; ?>>
                <div class="stat-content">
                    <h3>LIVE LOAD CELL WEIGHT</h3>
                    <p id="stat-live-weight"><?php echo $isLiveActive ? number_format($liveWeight, 2) : '0.00'; ?> <span class="sub-unit">kg</span></p>
                </div>
                <div class="stat-icon" <?php if ($isLiveActive) echo 'style="color: var(--color-orange);"'; ?>>
                    <?php if ($isLiveActive): ?>
                        <i class="fa-solid fa-bolt text-warning animate-pulse"></i>
                    <?php else: ?>
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    <?php endif; ?>
                </div>
            </div>
        </section>

        <!-- Table Card -->
        <section class="table-card main-card">
            <div class="table-header">
                <div class="table-title">
                    <i class="fa-solid fa-chart-simple title-chart-icon"></i>
                    <h2>MAC Scale Devices & Telemetry Records</h2>
                </div>
                <div class="table-controls">
                    <button class="btn btn-secondary btn-simulate" id="simulate-btn">
                        <i class="fa-solid fa-bolt"></i> Simulate Telemetry Update API
                    </button>
                    <span class="mac-format-tag">MAC Format: XX-XX-XX-XX-XX-XX</span>
                </div>
            </div>
            
            <div class="table-wrapper scrollbar-custom">
                <table id="records-table">
                    <thead>
                        <tr>
                            <th>LAST TELEMETRY TIME</th>
                            <th>MAC ADDRESS</th>
                            <th>DEVICE & LOCATION</th>
                            <th>WEIGHT Telemetry</th>
                            <th>POWER STATUS</th>
                            <th class="text-center">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="records-tbody">
                        <?php if (empty($logs)): ?>
                            <tr>
                                <td colspan="6" class="empty-state">
                                    <i class="fa-solid fa-scale-unbalanced"></i>
                                    <p>No scale logs recorded yet. Add a scale or stream live telemetry.</p>
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($logs as $row): 
                                $weightVal = floatval($row['weight']);
                                $hasWeight = ($weightVal > 0);
                                $maxCapacity = 150.0;
                                $percent = $hasWeight ? min(round(($weightVal / $maxCapacity) * 100), 100) : 0;
                                $weightText = $hasWeight ? number_format($weightVal, 2) . ' kg' : '-';
                                $percentText = $hasWeight ? $percent . '%' : '';
                                $levelClass = 'normal';
                                if ($weightVal > 100.0) $levelClass = 'danger';
                                elseif ($weightVal > 75.0) $levelClass = 'warning';
                                
                                $locParts = explode('/', $row['location'] ?? 'Scale Device');
                                $mainLoc = htmlspecialchars(trim($locParts[0]));
                                $subLoc = isset($locParts[1]) ? htmlspecialchars(trim($locParts[1])) : 'Weighing station';
                            ?>
                            <tr data-id="<?php echo htmlspecialchars($row['id']); ?>">
                                <td class="row-timestamp"><?php echo htmlspecialchars($row['timestamp']); ?></td>
                                <td>
                                    <span class="mac-pill">
                                        <i class="fa-solid fa-scale-unbalanced-stroke"></i> <?php echo htmlspecialchars(str_replace(':', '-', $row['mac'])); ?>
                                    </span>
                                </td>
                                <td>
                                    <div class="location-cell">
                                        <span class="location-title"><?php echo $mainLoc; ?></span>
                                        <span class="location-subtext"><i class="fa-solid fa-location-arrow"></i> <?php echo $subLoc; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="weight-cell">
                                        <div class="progress-bar-container" <?php if (!$hasWeight) echo 'style="opacity: 0.3;"'; ?>>
                                            <div class="progress-bar-fill <?php echo $levelClass; ?>" style="width: <?php echo $percent; ?>%;"></div>
                                        </div>
                                        <div class="weight-meta">
                                            <span class="weight-text-val"><?php echo $weightText; ?></span>
                                            <span class="weight-pct-val"><?php echo $percentText; ?></span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="power-badge">
                                        <i class="fa-solid fa-bolt"></i> ON
                                    </span>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn-action edit" onclick="triggerEdit('<?php echo htmlspecialchars($row['id']); ?>')">
                                            <i class="fa-solid fa-pencil"></i> Edit
                                        </button>
                                        <button class="btn-action delete" onclick="triggerDelete('<?php echo htmlspecialchars($row['id']); ?>')">
                                            <i class="fa-solid fa-trash-can"></i> Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </section>
        
    </div>

    <!-- Add/Edit Modal Form overlay -->
    <div class="modal-overlay" id="form-modal">
        <div class="modal-container glass-panel">
            <div class="modal-header">
                <h3 id="modal-title"><i class="fa-solid fa-plus-circle"></i> Log Scale Telemetry</h3>
                <span id="edit-indicator" class="badge hidden">Edit Mode</span>
                <button class="modal-close" id="close-modal-x">&times;</button>
            </div>
            
            <div class="modal-live-banner" id="modal-live-banner">
                <div class="live-banner-pulse"></div>
                <span id="modal-live-text">Waiting for load cell scale data...</span>
            </div>

            <form id="weight-form" autocomplete="off">
                <input type="hidden" id="record-id">
                
                <div class="form-group">
                    <label for="mac-address">
                        <span>MAC Address</span>
                        <span class="help-label">Reformat helper active</span>
                    </label>
                    <div class="input-wrapper">
                        <i class="fa-solid fa-microchip form-icon"></i>
                        <input type="text" id="mac-address" required placeholder="AA:BB:CC:DD:EE:FF" maxlength="17">
                    </div>
                    <span class="error-msg" id="mac-error"></span>
                </div>

                <div class="form-group">
                    <label for="location">
                        <span>Device & Location</span>
                        <span class="help-label">Where is scale located?</span>
                    </label>
                    <div class="input-wrapper">
                        <i class="fa-solid fa-location-dot form-icon"></i>
                        <input type="text" id="location" required placeholder="Warehouse Scale A" maxlength="40">
                    </div>
                </div>

                <div class="form-group">
                    <label for="weight-value">
                        <span>Weight (Load Cell Feed)</span>
                    </label>
                    <div class="input-wrapper readonly-wrapper" id="weight-wrapper">
                        <i class="fa-solid fa-weight-scale form-icon"></i>
                        <input type="number" id="weight-value" required readonly placeholder="0.00" step="0.01">
                        <span class="input-suffix">kg</span>
                    </div>
                    <span class="error-msg" id="weight-error"></span>
                </div>

                <div class="form-group">
                    <label for="timestamp">
                        <span>Custom Date & Time</span>
                    </label>
                    <div class="input-wrapper">
                        <i class="fa-regular fa-calendar form-icon"></i>
                        <input type="datetime-local" id="timestamp" required>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary" id="save-btn" disabled>
                        <i class="fa-solid fa-save"></i> Save Log
                    </button>
                    <button type="button" class="btn btn-secondary" id="close-modal-btn">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Custom Confirmation Modal Overlay -->
    <div class="modal-overlay" id="confirm-modal">
        <div class="modal-container confirm-container">
            <div class="confirm-icon-box">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>Delete Weight Record</h3>
            <p id="confirm-modal-text">Are you sure you want to permanently delete this telemetry weight record?</p>
            <div class="confirm-actions">
                <button class="btn btn-danger" id="confirm-yes-btn">Yes, Delete</button>
                <button class="btn btn-secondary" id="confirm-no-btn">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Toast Notifications Container -->
    <div id="toast-container"></div>

    <!-- JS Logic for real-time polling -->
    <script src="public/app.js"></script>
</body>
</html>
