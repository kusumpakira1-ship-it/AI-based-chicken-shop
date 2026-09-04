<?php
// pos.php - AI MeatVision POS Terminal (PHP Dynamic Template)
date_default_timezone_set('Asia/Kolkata');

// Load initial scale & product state from PHP backend
$liveFile = __DIR__ . '/data/live_weight.json';
$liveData = file_exists($liveFile) ? json_decode(file_get_contents($liveFile), true) : [
    'mac' => '',
    'weight' => 1.45,
    'location' => 'Simulated Scale',
    'updated_at' => date('Y-m-d H:i:s')
];
$initialWeight = isset($liveData['weight']) ? floatval($liveData['weight']) : 1.45;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FreshCraft AI - Professional Meat Vision & IoT Scale POS</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- Deep Learning AI Vision Models (TensorFlow.js + MobileNet + KNN Transfer Learning) -->
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/knn-classifier@1.2.2/dist/knn-classifier.min.js"></script>
</head>
<body class="light-theme">
    <div class="app-container">
        <!-- Top Navigation Header -->
        <header class="navbar">
            <div class="brand">
                <div class="brand-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                </div>
                <div class="brand-text">
                    <h1>Smart Vision Recognition</h1>
                </div>
            </div>

            <div class="status-pills">
                <div class="pill active" id="ai-status">
                    <span class="dot pulse"></span>
                    <span class="label" id="ai-status-text">AI Model: Ready</span>
                </div>
                <div class="pill active" id="scale-status">
                    <span class="dot green"></span>
                    <span class="label" id="scale-status-text">Scale: IoT Simulated</span>
                </div>
                <button class="btn btn-outline-sm" id="btn-serial-connect">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Connect Physical Scale
                </button>
            </div>

            <nav class="nav-links">
                <a href="index.php" class="nav-btn" title="Scale Monitoring Dashboard">
                    📊 Scale Monitoring
                </a>
                <button class="theme-toggle-btn" id="btn-toggle-theme" title="Toggle Light/Dark Theme">
                    <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    <svg class="icon-moon hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                </button>
                <button class="nav-btn active" data-tab="pos-tab">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    POS Terminal
                </button>
                <button class="nav-btn" id="btn-open-trainer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    🧠 Train Raw Cuts AI
                </button>
                <button class="nav-btn" data-tab="prices-tab" id="btn-open-price-mgr" style="white-space:nowrap;">
                    💰 Daily Prices (₹)
                </button>
                <button class="nav-btn" id="btn-open-upi-mgr" title="Shop UPI & QR Setup">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    📲 Shop UPI / QR Setup
                </button>
                <button class="nav-btn" id="btn-open-guide">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    IoT Setup Guide
                </button>
            </nav>
        </header>

        <!-- Main Workspace -->
        <main class="content-grid">
            <!-- Left Column: AI Vision & Sample Selection -->
            <section class="card vision-card">
                <div class="card-header">
                    <h2>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        AI Item Recognition Engine
                    </h2>
                    <!-- Camera Status Indicator Badge (Grey Pill) -->
                    <div class="pill" id="camera-status-pill" style="font-weight:700; background:var(--bg-input); border:1px solid var(--border-color); padding:6px 14px; border-radius:20px; display:inline-flex; align-items:center; gap:6px;">
                        <span class="dot" id="camera-status-dot" style="background:#ef4444; width:9px; height:9px; border-radius:50%; display:inline-block;"></span>
                        <span id="camera-status-text" style="font-size:0.82rem; color:var(--text-muted); font-weight:700;">Camera: OFF</span>
                    </div>
                </div>

                <!-- Sample Preset Gallery & Capture Section -->
                <div class="preset-section">
                    <div class="preset-header-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span class="section-label" style="margin-bottom:0; font-weight:800; font-size:0.85rem; color:var(--text-main);">Product Sample (Click to Select):</span>
                        <button class="btn btn-emerald btn-sm" id="btn-open-sample-modal" type="button">
                            ➕ Add Sample Photo
                        </button>
                    </div>

                    <div class="preset-grid" id="preset-grid">
                        <!-- Dynamic preset cards (default + custom captured) rendered by JS -->
                    </div>
                </div>

                <!-- Main Interactive Camera ON / OFF Button -->
                <div class="upload-zone" id="drop-zone" style="padding:12px; display:flex; justify-content:center; align-items:center; border:1px dashed var(--border-color); border-radius:var(--radius-md); background:var(--bg-input);">
                    <button class="btn btn-emerald btn-lg" id="btn-dropzone-camera" type="button" style="padding:11px 28px; font-size:0.96rem; font-weight:800; box-shadow:0 4px 15px rgba(5, 150, 105, 0.28); transition:all 0.2s ease;">
                        📷 Turn ON Camera Scan
                    </button>
                    <input type="file" id="file-input" accept="image/*" class="file-hidden" style="display:none;">
                </div>

                  <!-- Live Vision Display Frame (Idle Standby State) -->
                <div class="vision-viewport" id="vision-viewport-box">
                    <img id="active-vision-img" src="" alt="Active Vision Target" class="hidden">
                    <div id="vision-standby-placeholder" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:var(--text-dim); text-align:center; padding:20px; width:100%; height:100%;">
                        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        <span style="font-weight:800; font-size:0.95rem; color:var(--text-main);">Camera / Vision Standby</span>
                        <span style="font-size:0.78rem; max-width:80%;">Place item on scale, open live camera scan, or click a sample image</span>
                    </div>
                    <video id="webcam-feed" autoplay playsinline muted class="hidden" style="width:100%; height:100%; object-fit:cover; border-radius:var(--radius-md);"></video>
                    <button id="btn-snap-camera" class="btn btn-emerald btn-sm hidden" style="position:absolute; bottom:16px; left:35%; transform:translateX(-50%); z-index:10; box-shadow: 0 4px 15px rgba(0,0,0,0.4);">📸 Snap & Detect</button>
                    <button id="btn-resume-camera" class="btn btn-emerald btn-md hidden" style="position:absolute; bottom:16px; left:50%; transform:translateX(-50%); z-index:20; box-shadow:0 4px 20px rgba(16, 185, 129, 0.5); font-weight:800; padding:10px 22px; cursor:pointer;">▶️ Resume Camera / Scan Next Item</button>
                    <!-- Overlay Bounding Box HUD -->
                    <div class="bounding-box hidden" id="bbox-overlay" style="border:3px solid #10b981; border-radius:10px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; pointer-events:none; transition:all 0.3s ease;">
                        <div class="bbox-label" style="background:rgba(5, 150, 105, 0.95); color:#ffffff; padding:6px 14px; border-radius:6px; font-weight:800; font-size:0.9rem; width:fit-content; box-shadow:0 4px 12px rgba(0,0,0,0.3); display:flex; align-items:center; gap:8px;">
                            <span id="bbox-class">Scanning Live Feed...</span>
                            <span class="bbox-confidence" id="bbox-conf" style="opacity:0.88; font-weight:600; font-size:0.8rem;"></span>
                        </div>
                        <div id="bbox-match-hud" style="background:rgba(15, 23, 42, 0.92); border:2px solid #10b981; color:#ffffff; padding:8px 16px; border-radius:8px; font-weight:800; font-size:0.88rem; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.4); margin:0 auto;">
                            ⚡ Auto-Detect: Keep item steady in front of camera
                        </div>
                    </div>
                </div>

                    <!-- Anti-Fraud Mismatch Warning Banner -->
                    <div class="fraud-alert-banner hidden" id="fraud-alert-banner">
                        <div class="fraud-alert-icon">⚠️</div>
                        <div class="fraud-alert-content">
                            <strong>FRAUD / MISMATCH ALERT DETECTED!</strong>
                            <p id="fraud-alert-text">Selected item differs from live camera vision scan. Please verify!</p>
                        </div>
                        <button class="btn btn-warning btn-sm" id="btn-dismiss-fraud">I Verified Item</button>
                    </div>

                    <!-- AI Analysis Summary -->
                    <div class="ai-results-box">
                        <div class="ai-row">
                            <span class="ai-label">Detected Item:</span>
                            <strong class="ai-value-highlight" id="detected-item-name">Waiting for Scan...</strong>
                        </div>
                        <div class="ai-row">
                            <span class="ai-label">Confidence Score:</span>
                            <div class="confidence-bar-container">
                                <div class="confidence-bar" id="confidence-fill" style="width: 0%;"></div>
                                <span class="confidence-text" id="confidence-text">0%</span>
                            </div>
                        </div>
                        <div class="ai-metrics">
                            <div class="metric-chip">
                                <span class="m-label">Texture</span>
                                <span class="m-val" id="metric-texture">Standby</span>
                            </div>
                            <div class="metric-chip">
                                <span class="m-label">Meat Color</span>
                                <span class="m-val" id="metric-color">Standby</span>
                            </div>
                            <div class="metric-chip">
                                <span class="m-label">Freshness</span>
                                <span class="m-val green" id="metric-freshness">Ready</span>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Center/Right Column: IoT Scale & Real-time Checkout -->
                <section class="card pos-checkout-card">
                    <div class="card-header">
                        <h2>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            IoT Scale Matcher & Checkout
                        </h2>
                        <span class="badge badge-warning" id="scale-mode-badge">Auto Telemetry Live</span>
                    </div>

                    <!-- Weight Ticker Display (100% Automated IoT Load Cell Stream) -->
                    <div class="scale-display-container">
                        <div class="scale-header">
                            <span class="scale-title">REAL-TIME LOAD CELL READOUT</span>
                            <div class="scale-unit-toggle">
                                <span class="unit-btn active" id="live-telemetry-indicator">🟢 Live Load Cell Syncing</span>
                            </div>
                        </div>

                        <div class="scale-ticker">
                            <span class="digit-display" id="weight-digits">0.000</span>
                            <span class="unit-symbol">kg</span>
                        </div>

                        <!-- Scale Quick Controls: Zero Tare & Hold -->
                        <div class="scale-controls-bar" style="margin-top:12px; padding-top:12px; border-top:1px dashed var(--border-color); display:flex; gap:10px;">
                            <button class="btn btn-secondary btn-sm" id="btn-tare" style="flex:1; font-weight:700; padding:10px 14px;">
                                ⚖️ Zero / Tare Scale (0.000 kg)
                            </button>
                            <button class="btn btn-warning btn-sm" id="btn-hold" style="flex:1; font-weight:700; padding:10px 14px;">
                                🔒 Hold Weight
                            </button>
                        </div>
                    </div>

                    <!-- Order Calculations & Invoice Card -->
                    <div class="invoice-summary">
                        <!-- Modern POS Invoice Summary Card -->
                        <div class="pos-invoice-card" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                            
                            <!-- 1. Item & AI Match Header -->
                            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <span style="font-size:0.7rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; display:block;">Selected Product</span>
                                    <strong id="calc-item-title" style="font-size:1.05rem; font-weight:800; color:#0f172a;">None Selected (Waiting for Scan)</strong>
                                </div>
                                <span id="calc-ai-match-status" class="badge badge-success" style="background:#64748b; color:#ffffff; font-weight:700; padding:6px 12px; border-radius:20px; font-size:0.75rem;">Standby</span>
                            </div>

                            <!-- 2. Metrics Grid (Side by Side) -->
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                                <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:10px 12px;">
                                    <span style="font-size:0.68rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; display:block;">Unit Rate</span>
                                    <span id="calc-unit-rate" style="font-size:0.95rem; font-weight:800; color:#0f172a; font-family:monospace;">₹0.00 / kg</span>
                                </div>
                                <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:10px 12px;">
                                    <span style="font-size:0.68rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; display:block;">Scale Weight</span>
                                    <strong id="calc-weight-val" style="font-size:1.05rem; font-weight:800; color:#0f172a; font-family:monospace;">0.000 kg</strong>
                                </div>
                            </div>

                            <!-- 3. Total Payable Hero Banner -->
                            <div style="background:linear-gradient(135deg, #059669, #047857); color:#ffffff; border-radius:10px; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 15px rgba(5, 150, 105, 0.3);">
                                <div>
                                    <span style="font-size:0.75rem; font-weight:800; letter-spacing:0.6px; text-transform:uppercase; display:block; opacity:0.95;">Total Payable Amount</span>
                                    <small style="font-size:0.7rem; opacity:0.85;">Scale & AI Verified</small>
                                </div>
                                <div id="calc-total-price" style="font-size:1.7rem; font-weight:900; font-family:monospace; color:#ffffff; letter-spacing:0.5px;">₹0.00</div>
                            </div>

                            <!-- 4. Embedded Order Cart Bar (Directly Below Payable Amount) -->
                            <div class="order-cart-bar-embedded" id="order-cart-bar" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px 14px; display:flex; align-items:center; justify-content:space-between;">
                                <div class="cart-info" style="display:flex; gap:12px; align-items:center;">
                                    <span class="cart-count" id="cart-item-count" style="font-weight:700; font-size:0.86rem; color:#1e293b;">0 items in order</span>
                                    <span class="cart-total" id="cart-running-total" style="font-weight:800; font-size:0.92rem; color:#059669;">Total: ₹0.00</span>
                                </div>
                                <div class="cart-btns" style="display:flex; gap:6px;">
                                    <button class="btn btn-outline-sm" id="btn-view-cart">View Summary</button>
                                    <button class="btn btn-emerald btn-sm" id="btn-clear-cart">Clear Order</button>
                                </div>
                            </div>
                        </div>

                        <!-- 5. POS Action Buttons -->
                        <div class="pos-actions" style="display:flex; flex-direction:column; gap:10px; margin-top:4px;">
                            <button class="btn btn-emerald btn-lg btn-block" id="btn-add-cart">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                                Add Item to Bill Order
                            </button>
                            <button class="btn btn-primary btn-lg btn-block" id="btn-checkout">
                                💳 Generate Payment QR & Receipt
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <!-- Daily Meat Rates Manager Modal -->
            <div class="modal-backdrop hidden" id="price-modal">
                <div class="modal-card modal-md">
                    <div class="modal-header">
                        <h2>💰 Daily Meat Rates Management</h2>
                        <button class="btn-close" id="btn-close-price-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p class="modal-desc">Set morning market rates per kg. All prices update live across POS product sample cards and bill calculations.</p>
                        <form id="price-form">
                            <div class="price-grid" id="daily-price-grid">
                                <!-- Populated dynamically by JS for all default and custom categories -->
                            </div>

                            <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border-color); display:flex; gap:10px; justify-content:flex-end;">
                                <button type="button" class="btn btn-secondary" id="btn-cancel-price-modal" style="font-weight:700; padding:12px 18px;">
                                    ❌ Cancel
                                </button>
                                <button type="submit" class="btn btn-emerald" style="font-weight:700; padding:12px 18px; flex:1;">
                                    💾 Save Daily Rates (Apply to POS)
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Payment QR & Receipt Modal (Sequential Flow) -->
            <div class="modal-backdrop hidden" id="qr-modal">
                <div class="modal-card modal-md">
                    <div class="modal-header">
                        <h2 id="checkout-modal-title">
                            🧾 Customer Bill Slip
                        </h2>
                        <button class="btn-close" id="btn-close-qr-modal">&times;</button>
                    </div>
                    <div class="modal-body text-center">
                        
                        <!-- 1. Small Thermal Bill Slip (Always shown first) -->
                        <div class="receipt-print-area id-printable-receipt" id="printable-receipt">
                            <!-- Receipt details populated dynamically by JS -->
                        </div>

                        <!-- Step 1 Actions: Scan QR or Pay Cash -->
                        <div id="checkout-initial-actions" style="margin: 10px auto; max-width: 300px; display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn btn-emerald btn-block" id="btn-generate-qr-flow" type="button" style="font-weight: 800; padding: 12px 16px; font-size: 0.95rem;">
                                📲 Scan for UPI QR Code
                            </button>
                            <button class="btn btn-secondary btn-block" id="btn-cash-paid-flow" type="button" style="font-weight: 700; padding: 10px 14px;">
                                💵 Cash Payment (Mark Paid)
                            </button>
                        </div>

                        <!-- 2. QR Code Section (Revealed when "Scan for UPI QR Code" is clicked) -->
                        <div id="qr-display-section" style="display: none; margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border-color);">
                            <!-- Mode Switch Tabs (If custom scanner photo is uploaded) -->
                            <div id="checkout-qr-tabs" style="display:flex; justify-content:center; gap:8px; margin-bottom:12px;">
                                <button class="btn btn-emerald btn-sm" id="btn-show-dynamic-qr" type="button" style="font-weight:700;">⚡ Dynamic Amount QR</button>
                                <button class="btn btn-outline-sm btn-sm" id="btn-show-standee-qr" type="button" style="font-weight:700;">🏪 Shop Standee Scanner</button>
                            </div>

                            <div class="qr-box">
                                <img id="qr-code-img" src="" alt="UPI Payment QR Code" class="qr-img" style="width:200px; height:200px; object-fit:contain; border-radius:8px;">
                            </div>
                            
                            <div class="payment-amount-box" style="margin-top:8px;">
                                <span class="pay-label" style="font-size:0.85rem; color:var(--text-muted);">Amount to Pay:</span>
                                <h2 class="pay-amt" id="qr-total-amt" style="font-size:1.8rem; color:#059669; font-weight:900; margin:2px 0;">₹0.00</h2>
                                <p style="font-size:0.80rem; color:var(--text-muted); margin:0;">UPI ID: <strong id="display-upi-id" style="color:var(--text-main);">sunfrafresh@upi</strong></p>
                            </div>

                            <div class="payment-status-box pending" id="payment-status-box">
                                <span class="status-dot pulse"></span>
                                <span id="payment-status-text">Status: Waiting for Customer Payment...</span>
                            </div>

                            <div style="margin-top: 10px;">
                                <button class="btn btn-emerald btn-block" id="btn-simulate-paid" style="font-weight:800; padding:12px 14px;">
                                    ✅ Confirm Payment Received
                                </button>
                            </div>
                        </div>

                        <!-- Success Message Box (Shown after payment) -->
                        <div id="payment-success-banner" style="display:none; background:#ecfdf5; border:1px solid #10b981; border-radius:8px; padding:12px; margin:10px auto; max-width:320px; color:#065f46; font-weight:700; text-align:center;">
                            🎉 Payment Received Successfully! Click "Print Customer Slip" below.
                        </div>

                    </div>
                    <div class="modal-footer" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                        <button class="btn btn-secondary" id="btn-close-qr-footer">❌ Cancel / Close</button>
                        <button class="btn btn-primary" id="btn-print-receipt" style="font-weight:800; padding:10px 18px; display:none;">
                            🖨️ Print Customer Slip
                        </button>
                    </div>
                </div>
            </div>

        <!-- IoT Setup Guide Modal -->
        <div class="modal-backdrop hidden" id="guide-modal">
            <div class="modal-card">
                <div class="modal-header">
                    <h2>IoT Weight Scale Integration Guide</h2>
                    <button class="btn-close" id="btn-close-guide-modal">&times;</button>
                </div>
                <div class="modal-body guide-content">
                    <p>Connect your physical electronic weighing scale directly to FreshCraft MeatVision POS:</p>
                    <div class="guide-step">
                        <h3>1. RS232 / USB Serial Scale</h3>
                        <p>Click "Connect Physical Scale" in the top bar. Supports CAS, Avery Berkel, Essae, and Mettler Toledo scales via Web Serial API.</p>
                    </div>
                    <div class="guide-step">
                        <h3>2. ESP32 / Arduino Wi-Fi IoT Scale</h3>
                        <p>Send GET or POST requests to <code>/api/live?mac=YOUR_MAC&weight=1.450</code> or <code>/api/weights</code>.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Raw Meat Vision AI Model Trainer Modal -->
        <div class="modal-backdrop hidden" id="trainer-modal">
            <div class="modal-card modal-lg">
                <div class="modal-header">
                    <h2>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        Raw Meat Cuts AI Vision Studio (Transfer Learning)
                    </h2>
                    <button class="btn-close" id="btn-close-trainer-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="modal-desc">
                        Train custom deep learning neural feature embeddings directly in your browser. Upload sample photos of your shop's actual cutlets to calibrate the AI model to your exact lighting, cutting style, and weighing tray.
                    </p>

                    <div class="trainer-status-banner">
                        <div class="status-indicator">
                            <span class="dot green"></span>
                            <strong>Active Deep Vision Classifier: MobileNet Feature Extractor + KNN</strong>
                        </div>
                        <span class="sample-count-badge" id="total-samples-count">4 Categories Calibrated</span>
                    </div>

                    <!-- Meat Category Navigation Tabs (Rendered dynamically) -->
                    <div class="trainer-category-tabs" id="trainer-category-tabs">
                        <!-- Populated dynamically by JS for all active categories -->
                    </div>

                    <!-- Active Category Large High-Res Sample Gallery Panel -->
                    <div class="trainer-active-panel">
                        <div class="trainer-active-header">
                            <div class="trainer-active-title">
                                <h3 id="active-category-title">🥩 Goat Meat / Mutton Samples</h3>
                                <p id="active-category-desc">Curry cuts, chops, marrow cuts, dark crimson meat</p>
                            </div>
                            <div class="trainer-active-actions">
                                <label class="btn btn-primary btn-sm">
                                    📸 Upload New Photos
                                    <input type="file" multiple accept="image/*" class="file-hidden" id="active-trainer-file-input">
                                </label>
                                <button class="btn btn-emerald btn-sm" id="btn-active-trainer-snap" type="button">
                                    📷 Snap Live Camera Photo
                                </button>
                            </div>
                        </div>

                        <!-- Big Spacious Photo Grid -->
                        <div class="trainer-large-gallery" id="trainer-active-gallery">
                            <!-- Populated dynamically with large cards -->
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="display:flex; justify-content:space-between;">
                    <button class="btn btn-secondary" id="btn-reset-ai-model">Reset AI to Factory Baseline</button>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-secondary" id="btn-cancel-trainer-modal" type="button">❌ Cancel</button>
                        <button class="btn btn-emerald" id="btn-close-trainer-modal-footer">✅ Done / Resume POS</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Owner Add Sample Photo & Manage Products Modal -->
        <div class="modal-backdrop hidden" id="owner-sample-modal">
            <div class="modal-card modal-md">
                <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="font-size:1.15rem; margin:0;">➕ Product Samples & Category Manager</h2>
                    <button class="btn-close" id="btn-close-sample-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Top Action Button to Add New Item -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border-color);">
                        <p class="modal-desc" style="margin:0; font-size:0.80rem;">Manage product samples, edit rates, or create new categories.</p>
                        <button class="btn btn-emerald btn-sm" id="btn-toggle-new-cat" type="button" style="white-space:nowrap; font-weight:800;">
                            ➕ Add New Item
                        </button>
                    </div>

                    <!-- 1. Select Product Category with Edit and Delete icons inline -->
                    <div class="input-group" style="margin-bottom:14px;">
                        <label for="sample-modal-category" style="font-weight:700; display:block; margin-bottom:6px; font-size:0.88rem;">1. Select Product Category:</label>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <select id="sample-modal-category" class="sample-select" style="flex:1; padding:10px 12px; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main); font-weight:700; font-size:0.95rem;"></select>
                            <button id="btn-modal-edit-cat" type="button" title="Edit Selected Category" class="btn btn-secondary btn-sm" style="padding:10px 12px; font-weight:700; display:flex; align-items:center; gap:4px;">
                                ✏️ Edit
                            </button>
                            <button id="btn-modal-delete-cat" type="button" title="Delete Selected Category" class="btn btn-secondary btn-sm" style="padding:10px 12px; font-weight:700; color:#ef4444; border-color:#fca5a5; display:flex; align-items:center; gap:4px;">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>

                    <!-- New / Edit Category Input Fields Form (Opens when clicking "+ Add New Item" or "✏️ Edit") -->
                    <div id="new-category-fields" style="display:none; background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:14px; margin-bottom:14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <h4 id="category-form-title" style="margin:0; font-size:0.92rem; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                                <span>✨ Product Category Details</span>
                            </h4>
                            <button type="button" id="btn-close-cat-fields" class="btn-close" style="font-size:18px; line-height:1; cursor:pointer;">&times;</button>
                        </div>
                        <input type="hidden" id="edit-cat-id" value="">
                        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:10px; margin-bottom:10px;">
                            <div>
                                <label for="new-cat-name" style="font-size:0.78rem; font-weight:700; display:block; margin-bottom:4px;">Item Name</label>
                                <input type="text" id="new-cat-name" placeholder="e.g. Eggs / Country Eggs" style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid var(--border-color); font-weight:700; background:var(--bg-input); color:var(--text-main);">
                            </div>
                            <div>
                                <label for="new-cat-emoji" style="font-size:0.78rem; font-weight:700; display:block; margin-bottom:4px;">Icon / Emoji</label>
                                <input type="text" id="new-cat-emoji" placeholder="e.g. 🥚" style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid var(--border-color); font-weight:700; text-align:center; background:var(--bg-input); color:var(--text-main);">
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                            <div>
                                <label for="new-cat-price" style="font-size:0.78rem; font-weight:700; display:block; margin-bottom:4px;">Rate per kg / unit (₹)</label>
                                <input type="number" id="new-cat-price" value="180" step="5" style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid var(--border-color); font-weight:700; background:var(--bg-input); color:var(--text-main);">
                            </div>
                            <div>
                                <label for="new-cat-desc" style="font-size:0.78rem; font-weight:700; display:block; margin-bottom:4px;">Visual Description</label>
                                <input type="text" id="new-cat-desc" placeholder="e.g. Farm fresh white/brown eggs" style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid var(--border-color); font-weight:600; font-size:0.82rem; background:var(--bg-input); color:var(--text-main);">
                            </div>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:8px;">
                            <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-cat-details" style="font-weight:700;">
                                ❌ Cancel
                            </button>
                            <button type="button" class="btn btn-emerald btn-sm" id="btn-save-cat-details" style="font-weight:700;">
                                💾 Save Category Details
                            </button>
                        </div>
                    </div>

                    <!-- 2. Capture or Upload Main & Training Photos -->
                    <div class="input-group" style="margin-bottom:14px;">
                        <label style="font-weight:700; display:block; margin-bottom:6px; font-size:0.88rem;">2. Upload or Snap Sample Photo(s):</label>
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <label class="btn btn-outline-sm btn-block" id="btn-sample-modal-browse" style="cursor:pointer; display:flex; align-items:center; justify-content:center;">
                                📁 Upload Photo(s)
                                <input type="file" id="input-modal-sample-file" multiple accept="image/*" class="file-hidden">
                            </label>
                            <button class="btn btn-emerald btn-block" id="btn-sample-modal-snap" type="button">
                                📸 Snap via Live Camera
                            </button>
                        </div>

                        <!-- Preview Grid for Selected / Captured Photos -->
                        <div id="sample-modal-preview-box" style="display:none; background:var(--bg-input); border-radius:8px; padding:10px; border:1px dashed var(--border-color); text-align:center;">
                            <p style="font-size:0.76rem; color:var(--text-muted); margin-bottom:6px;">Captured / Selected Sample Preview:</p>
                            <div id="sample-modal-preview-gallery" style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; max-height:140px; overflow-y:auto;"></div>
                        </div>
                    </div>

                    <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border-color); display:flex; gap:10px; justify-content:flex-end;">
                        <button type="button" class="btn btn-secondary" id="btn-cancel-sample-modal" style="font-weight:700; padding:12px 18px;">
                            ❌ Cancel
                        </button>
                        <button class="btn btn-emerald" id="btn-submit-sample-modal" type="button" style="font-weight:800; padding:12px 18px; flex:1;">
                            💾 Save Photos & Train AI Model
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Shop Payment UPI & QR Setup Modal -->
        <div class="modal-backdrop hidden" id="upi-modal">
            <div class="modal-card modal-md">
                <div class="modal-header">
                    <h2>📲 Shop Payment UPI & Scanner Photo Setup</h2>
                    <button class="btn-close" id="btn-close-upi-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="modal-desc">Configure your shop's UPI VPA ID and upload your actual physical QR standee/scanner photo (PhonePe / Google Pay / Paytm / BHIM).</p>
                    
                    <!-- 1. UPI ID Input -->
                    <div class="input-group" style="margin-bottom:14px;">
                        <label for="shop-upi-vpa-input" style="font-weight:700; display:block; margin-bottom:4px;">1. Shop UPI VPA ID (For Payment Receipt & Dynamic QR)</label>
                        <input type="text" id="shop-upi-vpa-input" value="sunfrafresh@upi" placeholder="e.g. 9876543210@paytm or shopname@upi" style="width:100%; padding:10px 12px; border-radius:6px; border:1px solid var(--border-color); font-weight:800; font-family:var(--font-mono); font-size:1rem; background:var(--bg-card); color:var(--text-main);">
                    </div>

                    <!-- 2. Upload Actual Scanner / Standee Photo -->
                    <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:14px; margin-bottom:14px;">
                        <label style="font-weight:700; display:block; margin-bottom:6px; font-size:0.9rem;">2. Upload Physical Shop Standee / Scanner Photo (Optional)</label>
                        <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:10px;">Upload a clear photo or screenshot of your shop's PhonePe / Google Pay / Paytm counter scanner standee.</p>
                        
                        <div style="display:flex; gap:8px; margin-bottom:10px;">
                            <label class="btn btn-outline-sm" style="flex:1; justify-content:center; cursor:pointer;">
                                📁 Choose Photo / Image
                                <input type="file" id="shop-scanner-file-input" accept="image/*" class="file-hidden">
                            </label>
                            <button class="btn btn-emerald btn-sm" id="btn-snap-shop-scanner" type="button" style="flex:1; justify-content:center;">
                                📷 Snap via Webcam
                            </button>
                        </div>

                        <!-- Scanner Photo Preview Box -->
                        <div id="custom-scanner-preview-box" style="display:none; text-align:center; padding:10px; background:var(--bg-input); border-radius:8px; border:1px dashed var(--border-color);">
                            <img id="custom-scanner-preview-img" src="" alt="Custom Scanner Standee" style="max-width:180px; max-height:180px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.1); display:block; margin:0 auto 8px auto; object-fit:contain;">
                            <button class="btn btn-outline-sm btn-sm" id="btn-remove-custom-scanner" type="button" style="color:#ef4444; border-color:#fca5a5;">
                                ❌ Remove Custom Photo (Use Auto QR)
                            </button>
                        </div>
                    </div>

                    <!-- 3. Payment Display Mode -->
                    <div style="margin-bottom:14px; background:var(--bg-input); padding:12px; border-radius:8px; border:1px solid var(--border-color);">
                        <label style="font-weight:700; display:block; margin-bottom:6px; font-size:0.85rem;">3. Customer Checkout Display Preference:</label>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <label style="font-size:0.82rem; display:flex; align-items:center; gap:8px; cursor:pointer;">
                                <input type="radio" name="qr-display-mode" value="dynamic" id="mode-dynamic-qr" checked>
                                <strong>⚡ Dynamic Amount QR</strong> (Customer scans and exact total amount opens automatically)
                            </label>
                            <label style="font-size:0.82rem; display:flex; align-items:center; gap:8px; cursor:pointer;">
                                <input type="radio" name="qr-display-mode" value="standee" id="mode-standee-photo">
                                <strong>🏪 Show Uploaded Shop Scanner Standee Photo</strong>
                            </label>
                        </div>
                    </div>

                    <div style="margin-top:16px; display:flex; gap:10px; justify-content:flex-end;">
                        <button type="button" class="btn btn-secondary" id="btn-cancel-upi-modal" style="font-weight:700; padding:12px 18px;">
                            ❌ Cancel
                        </button>
                        <button class="btn btn-emerald" id="btn-save-upi-vpa" type="button" style="font-weight:700; padding:12px 18px; flex:1;">
                            💾 Save Shop Payment & Scanner Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <script src="app.js"></script>
</body>
</html>
