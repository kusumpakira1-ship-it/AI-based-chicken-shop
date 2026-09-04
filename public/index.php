<?php
// public/index.php - Sunfra Weight & Scale Monitoring (PHP Dynamic Template)
date_default_timezone_set('Asia/Kolkata');

$dbFile = __DIR__ . '/../data/weights.json';
$liveFile = __DIR__ . '/../data/live_weight.json';

$logs = file_exists($dbFile) ? (json_decode(file_get_contents($dbFile), true) ?: []) : [];
$liveData = file_exists($liveFile) ? (json_decode(file_get_contents($liveFile), true) ?: []) : [];

$initialLiveWeight = isset($liveData['weight']) ? number_format(floatval($liveData['weight']), 2) : '0.00';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Sunfra Weight & Scale Monitoring Dashboard. Real-time telemetry, load cell logging and filters.">
    <title>Sunfra Weight & Scale Monitoring</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- FontAwesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- CSS Style -->
    <link rel="stylesheet" href="style.css">
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
                    <p>Real-Time Scale Device Telemetry & Automatic Data Recording System (PHP Engine)</p>
                </div>
            </div>
            <div class="header-right">
                <div class="time-pill">
                    <span class="live-pulse"></span>
                    <span id="current-time"><?php echo date('d/m/Y, H:i:s'); ?></span>
                </div>
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
                    <p id="stat-total">0</p>
                </div>
                <div class="stat-icon">
                    <i class="fa-solid fa-weight-scale"></i>
                </div>
            </div>
            <!-- Card 2 -->
            <div class="stat-card green">
                <div class="stat-content">
                    <h3>DEVICES POWER ON</h3>
                    <p id="stat-active">0</p>
                </div>
                <div class="stat-icon">
                    <i class="fa-solid fa-bolt"></i>
                </div>
            </div>
            <!-- Card 3 -->
            <div class="stat-card red">
                <div class="stat-content">
                    <h3>OVERWEIGHT ALERTS (>100kg)</h3>
                    <p id="stat-alerts">0</p>
                </div>
                <div class="stat-icon">
                    <i class="fa-solid fa-circle"></i>
                </div>
            </div>
            <!-- Card 4 -->
            <div class="stat-card orange">
                <div class="stat-content">
                    <h3>LIVE LOAD CELL WEIGHT</h3>
                    <p id="stat-live-weight"><?php echo $initialLiveWeight; ?> <span class="sub-unit">kg</span></p>
                </div>
                <div class="stat-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
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
                        <tr>
                            <td colspan="6" class="empty-state">
                                <i class="fa-solid fa-spinner fa-spin loading-spinner"></i>
                                <p>Loading scale logs...</p>
                            </td>
                        </tr>
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

    <!-- Custom Confirmation Modal Overlay (Eliminates confirm() hang) -->
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

    <!-- JS Logic -->
    <script src="app.js"></script>
</body>
</html>
