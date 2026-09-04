/**
 * MeatVision AI POS & IoT Scale Application Engine
 * Pure ES6 Vanilla JS Architecture
 */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 1. Initial State & Inventory Catalog (Default + Dynamic Custom)
    // ----------------------------------------------------------------------
    const defaultCatalog = [
        { id: 'goat', name: 'Goat Meat / Mutton', category: 'Meat', emoji: '🥩', defaultPrice: 780, image: 'assets/images/goat_meat.jpg', texture: 'Coarse Grain', color: 'Deep Red', confidence: '98.4%', desc: 'Curry cuts, chops, ribs, marrow cuts' },
        { id: 'chicken', name: 'Chicken Meat (Curry Cut)', category: 'Poultry', emoji: '🍗', defaultPrice: 240, image: 'assets/images/chicken_meat.jpg', texture: 'Smooth Fiber', color: 'Pink / Pale', confidence: '97.2%', desc: 'Curry cuts, boneless breast, drumsticks' },
        { id: 'fish', name: 'Fresh Fish Fillets & Whole', category: 'Seafood', emoji: '🐟', defaultPrice: 450, image: 'assets/images/fish.jpg', texture: 'Silky Scales', color: 'Silver / White', confidence: '99.1%', desc: 'Rohu/Katla steaks, silver whole fish' },
        { id: 'prawns', name: 'Tiger Prawns / Shrimp', category: 'Seafood', emoji: '🦐', defaultPrice: 650, image: 'assets/images/prawns.jpg', texture: 'Segmented Shell', color: 'Translucent Grey', confidence: '96.8%', desc: 'Cleaned prawns, peeled shrimp' }
    ];

    let customCategories = [];
    try {
        customCategories = JSON.parse(localStorage.getItem('meatvision_custom_categories') || '[]');
        if (!Array.isArray(customCategories)) customCategories = [];
    } catch (e) {
        customCategories = [];
    }

    function getAllCategories() {
        return [...defaultCatalog, ...customCategories];
    }

    // Global Category Sample Gallery Map
    let categorySamplesMap = {
        goat: [
            { id: 'base_goat_1', image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600', isBase: true },
            { id: 'base_goat_2', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600', isBase: true },
            { id: 'base_goat_3', image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=600', isBase: true },
            { id: 'base_goat_4', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600', isBase: true }
        ],
        chicken: [
            { id: 'base_chicken_1', image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600', isBase: true },
            { id: 'base_chicken_2', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600', isBase: true },
            { id: 'base_chicken_3', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600', isBase: true },
            { id: 'base_chicken_4', image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600', isBase: true }
        ],
        fish: [
            { id: 'base_fish_1', image: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=600', isBase: true },
            { id: 'base_fish_2', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600', isBase: true },
            { id: 'base_fish_3', image: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=600', isBase: true }
        ],
        prawns: [
            { id: 'base_prawns_1', image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600', isBase: true },
            { id: 'base_prawns_2', image: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=600', isBase: true },
            { id: 'base_prawns_3', image: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600', isBase: true }
        ]
    };

    function loadCategorySamplesFromStorage() {
        try {
            const savedCustom = JSON.parse(localStorage.getItem('meatvision_active_learning') || '[]');
            savedCustom.forEach((s, idx) => {
                if (!categorySamplesMap[s.category]) {
                    categorySamplesMap[s.category] = [];
                }
                if (!categorySamplesMap[s.category].some(x => x.image === s.image)) {
                    categorySamplesMap[s.category].push({
                        id: 'custom_' + idx + '_' + (s.id || Date.now()),
                        image: s.image,
                        isBase: false
                    });
                }
            });
        } catch(e) {}
    }
    loadCategorySamplesFromStorage();

    function saveCategorySamplesToStorage() {
        const customOnly = [];
        Object.keys(categorySamplesMap).forEach(k => {
            (categorySamplesMap[k] || []).filter(s => !s.isBase).forEach(s => {
                customOnly.push({ category: k, image: s.image, id: s.id });
            });
        });
        localStorage.setItem('meatvision_active_learning', JSON.stringify(customOnly));
        localStorage.setItem('meatvision_custom_categories', JSON.stringify(customCategories));
    }

    let currentPrices = loadPrices();
    let selectedItem = null;
    let aiDetectedItem = null;
    let currentWeight = 0.0; // in kg
    let isScaleHold = false;
    let currencySymbol = '₹';
    let shopUpiId = localStorage.getItem('meatvision_shop_upi_id') || 'sunfrafresh@upi';

    function startLiveScalePolling() {
        setInterval(async () => {
            if (isScaleHold) return;
            try {
                const res = await fetch('/api/live');
                if (res.ok) {
                    const data = await res.json();
                    if (data && typeof data.weight === 'number' && data.weight >= 0) {
                        const scaleWeight = parseFloat(data.weight);
                        if (Math.abs(currentWeight - scaleWeight) > 0.005) {
                            currentWeight = scaleWeight;
                            if (weightSlider) weightSlider.value = currentWeight;
                            if (weightDigits) weightDigits.textContent = currentWeight.toFixed(3);
                            if (inputManualWeight && document.activeElement !== inputManualWeight) {
                                inputManualWeight.value = currentWeight.toFixed(3);
                            }
                            updatePOSCalculation();
                        }
                        const liveIndicator = document.getElementById('live-telemetry-indicator');
                        if (liveIndicator) {
                            liveIndicator.textContent = `🟢 Live Scale (${data.location || 'IoT Sync'})`;
                        }
                    }
                }
            } catch(e) {}
        }, 1000);
    }

    function checkFraudMismatch(selected, aiDetected) {
        const fraudBanner = document.getElementById('fraud-alert-banner');
        const fraudText = document.getElementById('fraud-alert-text');
        const matchStatusBadge = document.getElementById('calc-ai-match-status');

        if (!fraudBanner) return;

        if (aiDetected && aiDetected.id && selected && selected.id && aiDetected.id !== selected.id && !selected.isUnrecognized) {
            const selPrice = currentPrices[selected.id] || selected.defaultPrice || 750;
            const aiPrice = currentPrices[aiDetected.id] || aiDetected.defaultPrice || 240;
            if (fraudText) {
                fraudText.innerHTML = `Selected <strong>${selected.name} (₹${selPrice}/kg)</strong>, but camera vision scan detected <strong>${aiDetected.name} (₹${aiPrice}/kg)</strong>! Check for item substitution fraud!`;
            }
            fraudBanner.classList.remove('hidden');

            if (matchStatusBadge) {
                matchStatusBadge.textContent = '⚠️ Mismatch Warning!';
                matchStatusBadge.className = 'badge badge-warning';
                matchStatusBadge.style.background = '#ef4444';
                matchStatusBadge.style.color = '#ffffff';
            }
        } else {
            fraudBanner.classList.add('hidden');
            if (matchStatusBadge) {
                matchStatusBadge.textContent = '✅ AI Match Confirmed';
                matchStatusBadge.className = 'badge badge-success';
                matchStatusBadge.style.background = '';
                matchStatusBadge.style.color = '';
            }
        }
    }

    // ----------------------------------------------------------------------
    // 2. DOM Selectors
    // ----------------------------------------------------------------------
    const activeVisionImg = document.getElementById('active-vision-img');
    const bboxClass = document.getElementById('bbox-class');
    const bboxConf = document.getElementById('bbox-conf');
    const detectedItemName = document.getElementById('detected-item-name');
    const confidenceFill = document.getElementById('confidence-fill');
    const confidenceText = document.getElementById('confidence-text');
    const metricTexture = document.getElementById('metric-texture');
    const metricColor = document.getElementById('metric-color');

    const weightDigits = document.getElementById('weight-digits');
    const weightSlider = document.getElementById('weight-slider');
    const btnTare = document.getElementById('btn-tare');
    const btnHold = document.getElementById('btn-hold');
    const scaleModeBadge = document.getElementById('scale-mode-badge');
    const scaleStatusText = document.getElementById('scale-status-text');

    const invItemName = document.getElementById('inv-item-name');
    const invItemCategory = document.getElementById('inv-item-category');
    const invWeight = document.getElementById('inv-weight');
    const invRate = document.getElementById('inv-rate');
    const invSubtotal = document.getElementById('inv-subtotal');
    const chkCuttingCharge = document.getElementById('chk-cutting-charge');
    const cuttingChargeAmt = document.getElementById('cutting-charge-amt');
    const grandTotalDisplay = document.getElementById('grand-total-display');

    // Modals
    const priceModal = document.getElementById('price-modal');
    const qrModal = document.getElementById('qr-modal');
    const guideModal = document.getElementById('guide-modal');
    const priceEditorList = document.getElementById('price-editor-list');

    // Buttons
    const btnOpenPriceMgr = document.getElementById('btn-open-price-mgr');
    const btnClosePriceModal = document.getElementById('btn-close-price-modal');
    const btnSavePrices = document.getElementById('btn-save-prices');
    const btnResetDefaultPrices = document.getElementById('btn-reset-default-prices');

    const btnGenerateQr = document.getElementById('btn-generate-qr');
    const btnCloseQrModal = document.getElementById('btn-close-qr-modal');
    const btnSimulatePaid = document.getElementById('btn-simulate-paid');
    const qrTotalAmt = document.getElementById('qr-total-amt');
    const paymentStatusBox = document.getElementById('payment-status-box');

    const btnOpenGuide = document.getElementById('btn-open-guide');
    const btnCloseGuideModal = document.getElementById('btn-close-guide-modal');
    const btnSerialConnect = document.getElementById('btn-serial-connect');
    const btnPrintReceipt = document.getElementById('btn-print-receipt');

    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    // ----------------------------------------------------------------------
    // 3. Application Initialization & Audio Synthesizer
    // ----------------------------------------------------------------------
    let customSamples = loadCustomSamples();

    function loadCustomSamples() {
        try {
            const saved = localStorage.getItem('meatvision_custom_samples');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return [];
    }

    function saveCustomSamples() {
        localStorage.setItem('meatvision_custom_samples', JSON.stringify(customSamples));
    }

    function init() {
        try {
            const shopUpiInput = document.getElementById('shop-upi-id');
            if (shopUpiInput) shopUpiInput.value = shopUpiId;
        } catch(e) {}
        
        try { renderDailyPriceGrid(); } catch(e) { console.error('Daily price grid render error:', e); }
        try { renderPresetGrid(); } catch(e) { console.error('Preset grid render error:', e); }
        try { setupPresetListeners(); } catch(e) { console.error('Preset listeners error:', e); }
        try { setupSampleCaptureListeners(); } catch(e) { console.error('Sample capture listeners error:', e); }
        try { setupUploadListeners(); } catch(e) { console.error('Upload listeners error:', e); }
        try { setupCameraListeners(); } catch(e) { console.error('Camera listeners error:', e); }
        try { setupScaleListeners(); } catch(e) { console.error('Scale listeners error:', e); }
        try { setupModalListeners(); } catch(e) { console.error('Modal listeners error:', e); }
        try { setupThemeToggle(); } catch(e) { console.error('Theme toggle error:', e); }
        try { setupTrainerModal(); } catch(e) { console.error('Trainer modal error:', e); }
        try { initMeatVisionEngine(); } catch(e) { console.error('Meat vision engine error:', e); }
        try { updatePOSCalculation(); } catch(e) { console.error('POS calculation update error:', e); }
        try { startLiveScalePolling(); } catch(e) { console.error('Scale polling error:', e); }

        const btnDismissFraud = document.getElementById('btn-dismiss-fraud');
        if (btnDismissFraud) {
            btnDismissFraud.addEventListener('click', () => {
                const fraudBanner = document.getElementById('fraud-alert-banner');
                if (fraudBanner) fraudBanner.classList.add('hidden');
            });
        }
    }

    function setupThemeToggle() {
        if (!btnToggleTheme) return;
        const iconSun = btnToggleTheme.querySelector('.icon-sun');
        const iconMoon = btnToggleTheme.querySelector('.icon-moon');

        btnToggleTheme.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-theme');
            if (isDark) {
                document.body.classList.remove('light-theme');
                iconSun.classList.add('hidden');
                iconMoon.classList.remove('hidden');
            } else {
                document.body.classList.add('light-theme');
                iconSun.classList.remove('hidden');
                iconMoon.classList.add('hidden');
            }
        });
    }

    // Audio Feedback Generator using Web Audio API
    function playBeep(type = 'scan') {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'scan') {
                osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.08);
            } else if (type === 'success') {
                osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
                osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.35);
            }
        } catch (e) {
            console.log('Audio not allowed without gesture');
        }
    }

    // ----------------------------------------------------------------------
    // 4. Daily Price Management (LocalStorage Sync)
    // ----------------------------------------------------------------------
    function loadPrices() {
        const saved = localStorage.getItem('meatvision_daily_prices');
        let priceMap = {};
        if (saved) {
            try { priceMap = JSON.parse(saved); } catch (e) {}
        }
        getAllCategories().forEach(item => {
            if (typeof priceMap[item.id] === 'undefined') {
                priceMap[item.id] = item.defaultPrice || 200;
            }
        });
        return priceMap;
    }

    function savePrices() {
        localStorage.setItem('meatvision_daily_prices', JSON.stringify(currentPrices));
    }

    function renderDailyPriceGrid() {
        const grid = document.getElementById('daily-price-grid');
        if (!grid) return;
        grid.innerHTML = '';

        getAllCategories().forEach(item => {
            const rate = currentPrices[item.id] || item.defaultPrice || 200;
            const card = document.createElement('div');
            card.className = 'price-item-card';
            card.innerHTML = `
                <div class="price-item-title">
                    <strong>${item.emoji || '📦'} ${item.name}</strong>
                    <small>${item.desc || item.category || 'Price per ' + (item.unit || 'kg')}</small>
                </div>
                <div class="price-input-wrapper">
                    <span>₹</span>
                    <input type="number" id="price-${item.id}" data-id="${item.id}" value="${rate}" step="5" min="10">
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function deleteCategory(catId, catName) {
        if (confirm(`Are you sure you want to delete the product "${catName}"?\n\nThis will remove it from the POS screen, daily prices, and AI vision model.`)) {
            customCategories = customCategories.filter(c => c.id !== catId);
            delete categorySamplesMap[catId];
            delete currentPrices[catId];
            if (knnMeatClassifier) {
                try { knnMeatClassifier.clearClass(catId); } catch(e) {}
                delete sampleCounts[catId];
            }
            if (selectedItem && selectedItem.id === catId) {
                selectedItem = null;
            }
            savePrices();
            saveCategorySamplesToStorage();
            populateSampleModalCategoryDropdown();
            renderPresetGrid();
            renderDailyPriceGrid();
            renderTrainerCategoryTabs();
            renderTrainerGalleries();
            playBeep('scan');
            alert(`🗑️ Product "${catName}" deleted successfully.`);
        }
    }

    // ----------------------------------------------------------------------
    // 5. Dynamic Sample Gallery, Category Selector & AI Classification
    // ----------------------------------------------------------------------
    function renderPresetGrid(activeId = null) {
        const presetGrid = document.getElementById('preset-grid');
        if (!presetGrid) return;

        presetGrid.innerHTML = '';

        // 1. Render All Available Catalog Products (Default + Custom items)
        getAllCategories().forEach((item, index) => {
            const card = document.createElement('div');
            const isActive = selectedItem && selectedItem.id === item.id;
            card.className = 'preset-card' + (isActive ? ' active' : '');
            card.dataset.preset = item.id;
            card.dataset.type = 'catalog';

            const price = currentPrices[item.id] || item.defaultPrice || 200;

            card.innerHTML = `
                <img src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=400'">
                <div class="preset-info" style="padding:6px;">
                    <span class="preset-title" style="font-weight:800; font-size:0.85rem; color:var(--text-main); display:block;">${item.emoji ? item.emoji + ' ' : ''}${item.name}</span>
                    <span class="preset-tag" style="font-size:0.75rem; color:var(--emerald); font-weight:800; display:block; margin-top:2px;">Rate: ₹${price}/${item.unit || 'kg'}</span>
                </div>
            `;

            card.addEventListener('click', () => {
                document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectItem(item);
            });

            presetGrid.appendChild(card);
        });

        // 2. Render Custom User Captured / Uploaded Samples
        customSamples.forEach(sample => {
            const card = document.createElement('div');
            const isActive = activeId === sample.id;
            card.className = 'preset-card' + (isActive ? ' active' : '');
            card.dataset.preset = sample.categoryId;
            card.dataset.id = sample.id;
            card.dataset.type = 'custom';

            card.innerHTML = `
                <button class="btn-delete-sample" title="Remove custom sample">&times;</button>
                <img src="${sample.image}" alt="${sample.title}">
                <div class="preset-info" style="padding:6px;">
                    <span class="preset-title" style="font-weight:800; font-size:0.85rem; color:var(--text-main); display:block;">${sample.title}</span>
                    <span class="preset-tag" style="font-size:0.74rem; color:var(--text-dim); display:block;">${sample.tag || 'Custom Photo'}</span>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete-sample')) {
                    e.stopPropagation();
                    deleteCustomSample(sample.id);
                    return;
                }
                document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                const targetItem = getAllCategories().find(i => i.id === sample.categoryId) || defaultCatalog[0];
                selectItem(targetItem, sample.image);
            });

            presetGrid.appendChild(card);
        });
    }

    function deleteCustomSample(sampleId) {
        customSamples = customSamples.filter(s => s.id !== sampleId);
        saveCustomSamples();
        renderPresetGrid();
        playBeep('scan');
    }

    function setupSampleCaptureListeners() {
        const btnToggleAddSample = document.getElementById('btn-toggle-add-sample');
        const sampleCapturePanel = document.getElementById('sample-capture-panel');
        const sampleCategorySelect = document.getElementById('sample-category-select');
        const btnAddSampleCamera = document.getElementById('btn-add-sample-camera');
        const btnAddSampleFile = document.getElementById('btn-add-sample-file');
        const inputSampleFile = document.getElementById('input-sample-file');

        if (btnToggleAddSample && sampleCapturePanel) {
            btnToggleAddSample.addEventListener('click', () => {
                sampleCapturePanel.classList.toggle('hidden');
            });
        }

        if (btnAddSampleCamera) {
            btnAddSampleCamera.addEventListener('click', async () => {
                const webcamFeed = document.getElementById('webcam-feed');
                const btnToggleCamera = document.getElementById('btn-toggle-camera');
                const categoryId = sampleCategorySelect ? sampleCategorySelect.value : 'chicken';
                const catItem = defaultCatalog.find(i => i.id === categoryId) || defaultCatalog[0];

                // If camera is not active yet, auto-start camera
                if (!webcamStream || !webcamFeed || webcamFeed.classList.contains('hidden')) {
                    if (btnToggleCamera) {
                        btnToggleCamera.click();
                        setTimeout(() => {
                            alert(`🎥 Camera live stream activated! Align your ${catItem.name} sample and click "Snap from Camera" again.`);
                        }, 500);
                    }
                    return;
                }

                // Capture snapshot from live webcam video element
                const canvas = document.createElement('canvas');
                canvas.width = webcamFeed.videoWidth || 640;
                canvas.height = webcamFeed.videoHeight || 480;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(webcamFeed, 0, 0, canvas.width, canvas.height);
                const snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.92);

                await addCustomSample(categoryId, snapshotDataUrl, 'Camera Snap');
            });
        }

        if (btnAddSampleFile && inputSampleFile) {
            btnAddSampleFile.addEventListener('click', () => inputSampleFile.click());

            inputSampleFile.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const categoryId = sampleCategorySelect ? sampleCategorySelect.value : 'chicken';
                    const reader = new FileReader();
                    reader.onload = async (evt) => {
                        await addCustomSample(categoryId, evt.target.result, 'Uploaded File');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    async function addCustomSample(categoryId, imageDataUrl, sourceTag = 'Custom Snap') {
        const catItem = defaultCatalog.find(i => i.id === categoryId) || defaultCatalog[0];
        const newSample = {
            id: 'sample_' + Date.now(),
            categoryId: categoryId,
            title: catItem.name,
            tag: sourceTag,
            image: imageDataUrl,
            timestamp: Date.now()
        };

        customSamples.push(newSample);
        saveCustomSamples();

        // Train Deep Learning Model on this new image!
        if (isKnnReady && knnMeatClassifier) {
            await trainSampleFromImage(imageDataUrl, categoryId);
        }

        renderPresetGrid(newSample.id);

        // Select item & display active vision target!
        selectItem(catItem, imageDataUrl);
        playBeep('success');
    }

    function setupPresetListeners() {
        // 1-Click Manual Override Chips for Operator (with Active Learning)
        document.querySelectorAll('.btn-override-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.override;
                const targetItem = defaultCatalog.find(i => i.id === targetId) || defaultCatalog[0];
                renderPresetGrid(targetId);
                const currentImg = activeVisionImg.src;
                const overrideItemObj = {
                    ...targetItem,
                    confidence: 'Manual Confirmed (100%)'
                };
                selectItem(overrideItemObj, currentImg);

                // Active Learning: Instantly train the Deep Learning KNN model on this photo!
                if (activeVisionImg && activeVisionImg.src) {
                    trainSampleFromImage(activeVisionImg, targetId).then(() => {
                        console.log(`Active Learning: Trained Deep Model on ${targetId}`);
                    });
                }
            });
        });
    }

    function selectItem(item, customImgUrl = null) {
        selectedItem = item;
        playBeep('scan');

        const standbyPlaceholder = document.getElementById('vision-standby-placeholder');
        if (standbyPlaceholder) standbyPlaceholder.style.display = 'none';

        const webcamFeed = document.getElementById('webcam-feed');
        if (webcamFeed && !webcamFeed.classList.contains('hidden')) {
            if (activeVisionImg) activeVisionImg.classList.add('hidden');
        } else if (activeVisionImg) {
            activeVisionImg.src = customImgUrl || item.image;
            activeVisionImg.classList.remove('hidden');
        }

        const bboxOverlay = document.getElementById('bbox-overlay');
        if (bboxOverlay) bboxOverlay.classList.remove('hidden');
        
        if (item.isUnrecognized) {
            bboxClass.textContent = `⚠️ ${item.detectedLabel || 'Unrecognized Object'}`;
            bboxConf.textContent = 'Not in Catalog';
            if (bboxOverlay) {
                bboxOverlay.style.borderColor = '#ef4444';
                bboxOverlay.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
            }
            if (bboxClass.parentElement) bboxClass.parentElement.style.background = '#ef4444';

            detectedItemName.textContent = item.name;
            detectedItemName.style.color = '#ef4444';

            confidenceFill.style.width = '20%';
            confidenceFill.style.background = '#ef4444';
            confidenceText.textContent = item.confidence || 'Uncertain';

            metricTexture.textContent = 'Non-Meat / External';
            metricColor.textContent = 'Uncertain';
            const metricFreshness = document.getElementById('metric-freshness');
            if (metricFreshness) {
                metricFreshness.textContent = '⚠️ Pick Preset';
                metricFreshness.className = 'm-val red';
            }
        } else {
            bboxClass.textContent = item.name;
            bboxConf.textContent = item.confidence || '98.5% Conf.';
            if (bboxOverlay) {
                bboxOverlay.style.borderColor = 'var(--emerald)';
                bboxOverlay.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
            }
            if (bboxClass.parentElement) bboxClass.parentElement.style.background = 'var(--emerald)';

            detectedItemName.textContent = item.name;
            detectedItemName.style.color = 'var(--emerald)';

            confidenceFill.style.width = item.confidence || '98.5%';
            confidenceFill.style.background = 'linear-gradient(90deg, var(--primary), var(--emerald))';
            confidenceText.textContent = item.confidence || '98.5%';

            metricTexture.textContent = item.texture || 'Medium Grain';
            metricColor.textContent = item.color || 'Standard';
            const metricFreshness = document.getElementById('metric-freshness');
            if (metricFreshness) {
                metricFreshness.textContent = '99% Optimal';
                metricFreshness.className = 'm-val green';
            }
        }

        // Recalculate POS Invoice & Check Mismatch Fraud
        checkFraudMismatch(selectedItem, aiDetectedItem);
        updatePOSCalculation();

        // If camera is ON and was paused, resume scanning to verify item placed on weight machine
        if (webcamStream && isCameraPaused) {
            resumeCameraStream();
        }
    }

    // Custom Drag & Drop Image Analyzer
    function setupUploadListeners() {
        if (!dropZone || !fileInput) return;

        const btnDropzoneCamera = document.getElementById('btn-dropzone-camera');
        const btnDropzoneBrowse = document.getElementById('btn-dropzone-browse');

        if (btnDropzoneCamera) {
            btnDropzoneCamera.addEventListener('click', (e) => {
                e.stopPropagation();
                const btnToggleCamera = document.getElementById('btn-toggle-camera');
                if (btnToggleCamera) btnToggleCamera.click();
            });
        }

        if (btnDropzoneBrowse) {
            btnDropzoneBrowse.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }

        dropZone.addEventListener('click', (e) => {
            if (e.target.closest('#btn-dropzone-camera') || e.target.closest('#btn-dropzone-browse')) return;
            fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleUploadedFile(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleUploadedFile(e.target.files[0]);
            }
        });
    }

    function handleUploadedFile(file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const imgUrl = evt.target.result;
            // Classify image based on content analysis simulation
            analyzeCustomImage(imgUrl, file.name);
        };
        reader.readAsDataURL(file);
    }

    // Live Camera Setup & Controls
    let webcamStream = null;
    let isSimulatedCamera = false;
    let simAnimInterval = null;
    let liveWebcamInterval = null;

    async function requestRealWebcamStream() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const err = new Error('Webcam API unsupported in browser');
            err.name = 'UnsupportedError';
            throw err;
        }

        let lastError = null;

        // 1. Direct standard webcam request
        try {
            return await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e1) {
            console.log('Direct video request failed:', e1);
            lastError = e1;
            if (e1.name === 'NotAllowedError' || e1.name === 'PermissionDeniedError' || e1.name === 'NotReadableError' || e1.name === 'TrackStartError') {
                throw e1;
            }
        }

        // 2. Try enumerating specific video devices
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            for (const dev of videoDevices) {
                try {
                    return await navigator.mediaDevices.getUserMedia({
                        video: { deviceId: { exact: dev.deviceId } }
                    });
                } catch (eDev) {
                    lastError = eDev;
                    if (eDev.name === 'NotAllowedError' || eDev.name === 'PermissionDeniedError') throw eDev;
                }
            }
        } catch (e2) {
            if (e2.name === 'NotAllowedError' || e2.name === 'PermissionDeniedError') throw e2;
        }

        // 3. Try fallback constraints
        try {
            return await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
        } catch (e3) {
            lastError = e3;
            if (e3.name === 'NotAllowedError' || e3.name === 'PermissionDeniedError') throw e3;
        }

        throw lastError || new Error('Physical webcam not accessible');
    }

    function updateCameraStatusUI(status) {
        const btnDropzoneCamera = document.getElementById('btn-dropzone-camera');
        const statusDot = document.getElementById('camera-status-dot');
        const statusText = document.getElementById('camera-status-text');

        if (status === 'live' || status === 'on') {
            if (btnDropzoneCamera) {
                btnDropzoneCamera.innerHTML = '🛑 Turn OFF Camera (Stop Scan)';
                btnDropzoneCamera.className = 'btn btn-danger btn-lg';
                btnDropzoneCamera.style.background = '#dc2626';
                btnDropzoneCamera.style.borderColor = '#dc2626';
                btnDropzoneCamera.style.color = '#ffffff';
                btnDropzoneCamera.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.35)';
            }
            if (statusDot) {
                statusDot.style.background = '#10b981';
                statusDot.className = 'dot pulse';
            }
            if (statusText) {
                statusText.textContent = 'Camera: LIVE SCANNING';
                statusText.style.color = 'var(--emerald)';
                statusText.style.fontWeight = '800';
            }
        } else if (status === 'paused') {
            if (btnDropzoneCamera) {
                btnDropzoneCamera.innerHTML = '🛑 Turn OFF Camera (Stop Scan)';
                btnDropzoneCamera.className = 'btn btn-danger btn-lg';
                btnDropzoneCamera.style.background = '#dc2626';
                btnDropzoneCamera.style.borderColor = '#dc2626';
                btnDropzoneCamera.style.color = '#ffffff';
            }
            if (statusDot) {
                statusDot.style.background = '#f59e0b';
                statusDot.className = 'dot';
            }
            if (statusText) {
                statusText.textContent = 'Camera: PAUSED (Item Matched)';
                statusText.style.color = '#d97706';
                statusText.style.fontWeight = '800';
            }
        } else {
            // OFF
            if (btnDropzoneCamera) {
                btnDropzoneCamera.innerHTML = '📷 Turn ON Camera Scan';
                btnDropzoneCamera.className = 'btn btn-emerald btn-lg';
                btnDropzoneCamera.style.background = '';
                btnDropzoneCamera.style.borderColor = '';
                btnDropzoneCamera.style.color = '';
                btnDropzoneCamera.style.boxShadow = '0 4px 15px rgba(5, 150, 105, 0.28)';
            }
            if (statusDot) {
                statusDot.style.background = '#ef4444';
                statusDot.className = 'dot';
            }
            if (statusText) {
                statusText.textContent = 'Camera: OFF';
                statusText.style.color = 'var(--text-muted)';
                statusText.style.fontWeight = '700';
            }
        }
    }

    async function toggleCameraStream() {
        const btnSnapCamera = document.getElementById('btn-snap-camera');
        const webcamFeed = document.getElementById('webcam-feed');
        const activeImg = document.getElementById('active-vision-img');
        const standby = document.getElementById('vision-standby-placeholder');

        if (webcamStream) {
            stopWebcam();
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('🎥 Camera Unavailable:\n\nPlease make sure you are accessing this application on http://127.0.0.1:8000 or http://localhost:8000 for camera access.');
            return;
        }

        try {
            webcamStream = await requestRealWebcamStream();
            if (webcamFeed) {
                webcamFeed.srcObject = webcamStream;
                webcamFeed.classList.remove('hidden');
                webcamFeed.style.display = 'block';
                try { await webcamFeed.play(); } catch(e) {}
            }
            if (activeImg) {
                activeImg.classList.add('hidden');
                activeImg.style.display = 'none';
            }
            if (standby) standby.style.display = 'none';

            if (btnSnapCamera) btnSnapCamera.classList.remove('hidden');
            
            updateCameraStatusUI('live');

            isCameraPaused = false;
            startLiveWebcamInterval();

        } catch (err) {
            console.error('Camera Access Error:', err);
            stopWebcam();

            if (standby) {
                standby.style.display = 'flex';
                let reasonTitle = '🔒 Camera Permission Blocked';
                let reasonGuide = `1. Look at your browser address bar at the top left (next to <code>http://127.0.0.1:8000</code>).<br>2. Click the <strong>Sliders / Lock icon 🔒</strong>.<br>3. Toggle <strong>Camera</strong> to <strong>ALLOW</strong>.<br>4. Click "Turn ON Camera Scan" again.`;

                if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                    reasonTitle = '📷 Camera Busy / Locked';
                    reasonGuide = `Your camera is currently being used by another application (Zoom, Teams, Skype, or Windows Camera app).<br>👉 Please close those applications and try clicking "Turn ON Camera Scan" again.`;
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    reasonTitle = '🔌 No Physical Camera Detected';
                    reasonGuide = `No webcam detected on your computer.<br>👉 Please plug in your USB camera and click "Turn ON Camera Scan" again.`;
                }

                standby.innerHTML = `
                    <div style="padding:14px; text-align:center; color:#dc2626; background:#fef2f2; border:1px solid #fca5a5; border-radius:10px; margin:10px; width:92%;">
                        <h4 style="margin:0 0 6px 0; font-weight:800; font-size:0.95rem;">${reasonTitle}</h4>
                        <div style="background:#ffffff; border:1px solid #fca5a5; padding:10px; border-radius:6px; font-size:0.80rem; text-align:left; color:#1e293b; line-height:1.5;">
                            <strong>How to fix:</strong><br>${reasonGuide}
                        </div>
                    </div>
                `;
            }
        }
    }

    let isCameraPaused = false;

    function startLiveWebcamInterval() {
        const webcamFeed = document.getElementById('webcam-feed');
        if (liveWebcamInterval) clearInterval(liveWebcamInterval);
        isCameraPaused = false;

        liveWebcamInterval = setInterval(() => {
            if (webcamStream && webcamFeed && webcamFeed.videoWidth > 0 && !isCameraPaused) {
                const bboxClass = document.getElementById('bbox-class');
                const bboxMatchHud = document.getElementById('bbox-match-hud');
                const bboxOverlay = document.getElementById('bbox-overlay');
                if (bboxOverlay) bboxOverlay.classList.remove('hidden');

                // STEP 1: Worker MUST select what they want to sell from the sample images first!
                if (!selectedItem) {
                    if (bboxClass) bboxClass.textContent = '👈 Step 1: Select Sample Image';
                    if (bboxMatchHud) {
                        bboxMatchHud.innerHTML = '👉 Please click what you want to sell from the sample photos above first!';
                        bboxMatchHud.style.background = 'rgba(217, 119, 6, 0.95)';
                        bboxMatchHud.style.borderColor = '#f59e0b';
                    }
                    return;
                }

                // STEP 2: Item MUST be placed on the weight machine (currentWeight > 0.05 kg)!
                if (currentWeight <= 0.05) {
                    if (bboxClass) bboxClass.textContent = `Selected: ${selectedItem.name} | Scale: 0.000 kg`;
                    if (bboxMatchHud) {
                        bboxMatchHud.innerHTML = `⚖️ Step 2: Place ${selectedItem.name} on the weight machine (0.000 kg detected)`;
                        bboxMatchHud.style.background = 'rgba(15, 23, 42, 0.92)';
                        bboxMatchHud.style.borderColor = '#10b981';
                    }
                    return;
                }

                // STEP 3: Both conditions satisfied -> Capture frame & verify matching!
                if (bboxClass) bboxClass.textContent = `Scanning ${selectedItem.name} on Scale (${currentWeight.toFixed(3)} kg)...`;
                if (bboxMatchHud) {
                    bboxMatchHud.innerHTML = `🔍 Verifying item on weight machine with selected ${selectedItem.name}...`;
                    bboxMatchHud.style.background = 'rgba(15, 23, 42, 0.92)';
                    bboxMatchHud.style.borderColor = '#10b981';
                }

                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(webcamFeed, 0, 0, canvas.width, canvas.height);
                const snapshotUrl = canvas.toDataURL('image/jpeg', 0.85);
                analyzeCustomImage(snapshotUrl, 'live_stream_frame.jpg', true);
            }
        }, 1000);
    }

    function pauseCameraFeedOnDetection() {
        const webcamFeed = document.getElementById('webcam-feed');
        const btnResumeCamera = document.getElementById('btn-resume-camera');
        const btnSnapCamera = document.getElementById('btn-snap-camera');

        if (webcamFeed && !isCameraPaused) {
            try { webcamFeed.pause(); } catch(e) {}
            isCameraPaused = true;

            if (liveWebcamInterval) {
                clearInterval(liveWebcamInterval);
                liveWebcamInterval = null;
            }

            if (btnResumeCamera) btnResumeCamera.classList.remove('hidden');
            if (btnSnapCamera) btnSnapCamera.classList.add('hidden');
            
            updateCameraStatusUI('paused');
            playBeep('success');
        }
    }

    function resumeCameraStream() {
        const webcamFeed = document.getElementById('webcam-feed');
        const btnResumeCamera = document.getElementById('btn-resume-camera');
        const btnSnapCamera = document.getElementById('btn-snap-camera');

        if (webcamFeed && webcamStream) {
            try { webcamFeed.play(); } catch(e) {}
            isCameraPaused = false;

            if (btnResumeCamera) btnResumeCamera.classList.add('hidden');
            if (btnSnapCamera) btnSnapCamera.classList.remove('hidden');
            
            updateCameraStatusUI('live');
            startLiveWebcamInterval();
        }
    }

    function stopWebcam() {
        const btnSnapCamera = document.getElementById('btn-snap-camera');
        const btnResumeCamera = document.getElementById('btn-resume-camera');
        const webcamFeed = document.getElementById('webcam-feed');
        const activeImg = document.getElementById('active-vision-img');
        const standby = document.getElementById('vision-standby-placeholder');

        if (webcamStream) {
            webcamStream.getTracks().forEach(t => t.stop());
            webcamStream = null;
        }
        if (liveWebcamInterval) {
            clearInterval(liveWebcamInterval);
            liveWebcamInterval = null;
        }
        isSimulatedCamera = false;
        isCameraPaused = false;

        if (webcamFeed) {
            webcamFeed.classList.add('hidden');
            webcamFeed.style.display = 'none';
            webcamFeed.srcObject = null;
        }
        if (activeImg) {
            activeImg.classList.add('hidden');
            activeImg.style.display = 'none';
        }
        if (standby) {
            standby.style.display = 'flex';
        }
        if (btnSnapCamera) btnSnapCamera.classList.add('hidden');
        if (btnResumeCamera) btnResumeCamera.classList.add('hidden');
        
        updateCameraStatusUI('off');
    }

    function setupCameraListeners() {
        const btnDropzoneCamera = document.getElementById('btn-dropzone-camera');
        const btnSnapCamera = document.getElementById('btn-snap-camera');
        const btnResumeCamera = document.getElementById('btn-resume-camera');

        if (btnDropzoneCamera) {
            btnDropzoneCamera.addEventListener('click', toggleCameraStream);
        }

        if (btnSnapCamera) {
            btnSnapCamera.addEventListener('click', () => {
                const webcamFeed = document.getElementById('webcam-feed');
                if (webcamFeed && webcamStream) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 320;
                    canvas.height = 240;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(webcamFeed, 0, 0, canvas.width, canvas.height);
                    const snapshotUrl = canvas.toDataURL('image/jpeg', 0.88);
                    analyzeCustomImage(snapshotUrl, 'manual_snapshot.jpg');
                    playBeep('scan');
                }
            });
        }

        if (btnResumeCamera) {
            btnResumeCamera.addEventListener('click', () => {
                resumeCameraStream();
            });
        }
    }

    // ----------------------------------------------------------------------
    // 5. Deep Learning Transfer Learning Vision Engine (MobileNet + KNN)
    // ----------------------------------------------------------------------
    let mobilenetModel = null;
    let knnMeatClassifier = null;
    let isKnnReady = false;
    const sampleCounts = { goat: 0, chicken: 0, fish: 0, prawns: 0 };

    async function initMeatVisionEngine() {
        const aiStatusText = document.getElementById('ai-status-text');
        try {
            if (typeof tf !== 'undefined' && typeof mobilenet !== 'undefined' && typeof knnClassifier !== 'undefined') {
                if (aiStatusText) aiStatusText.textContent = 'AI: Loading Deep Model...';
                
                mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
                knnMeatClassifier = knnClassifier.create();
                
                await seedBaseMeatDataset();
                await loadKnnSamplesFromStorage();
                isKnnReady = true;
                
                if (aiStatusText) aiStatusText.textContent = 'AI: Deep Meat Vision Ready (KNN)';
                updateTrainerModalSampleCounts();
                console.log('Deep Learning Meat Vision Engine initialized successfully.');
            }
        } catch (e) {
            console.log('AI Engine initialization fallback:', e);
            if (aiStatusText) aiStatusText.textContent = 'AI: Feature Fallback Ready';
        }
    }

    async function seedBaseMeatDataset() {
        if (!knnMeatClassifier || !mobilenetModel) return;
        
        for (const item of defaultCatalog) {
            try {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = item.image;
                
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });

                if (img.width > 0 && img.height > 0) {
                    // 1. Full Frame Embedding
                    const fullAct = mobilenetModel.infer(img, true);
                    knnMeatClassifier.addExample(fullAct, item.id);
                    fullAct.dispose();
                    sampleCounts[item.id] = (sampleCounts[item.id] || 0) + 1;

                    // 2. Center 70% Scale-Focus Crop
                    const c1 = document.createElement('canvas');
                    const ctx1 = c1.getContext('2d');
                    c1.width = 224; c1.height = 224;
                    const w70 = img.width * 0.7, h70 = img.height * 0.7;
                    ctx1.drawImage(img, (img.width - w70) / 2, (img.height - h70) / 2, w70, h70, 0, 0, 224, 224);
                    const act1 = mobilenetModel.infer(c1, true);
                    knnMeatClassifier.addExample(act1, item.id);
                    act1.dispose();
                    sampleCounts[item.id]++;

                    // 3. Center 50% Tight Meat Cutlet Crop (Macro Texture)
                    const c2 = document.createElement('canvas');
                    const ctx2 = c2.getContext('2d');
                    c2.width = 224; c2.height = 224;
                    const w50 = img.width * 0.5, h50 = img.height * 0.5;
                    ctx2.drawImage(img, (img.width - w50) / 2, (img.height - h50) / 2, w50, h50, 0, 0, 224, 224);
                    const act2 = mobilenetModel.infer(c2, true);
                    knnMeatClassifier.addExample(act2, item.id);
                    act2.dispose();
                    sampleCounts[item.id]++;

                    // 4. Horizontal Flip Augmentation
                    const c3 = document.createElement('canvas');
                    const ctx3 = c3.getContext('2d');
                    c3.width = 224; c3.height = 224;
                    ctx3.translate(224, 0);
                    ctx3.scale(-1, 1);
                    ctx3.drawImage(img, 0, 0, 224, 224);
                    const act3 = mobilenetModel.infer(c3, true);
                    knnMeatClassifier.addExample(act3, item.id);
                    act3.dispose();
                    sampleCounts[item.id]++;
                }
            } catch (err) {
                console.log('Error seeding dataset for:', item.id, err);
            }
        }
    }

    function saveKnnSampleToStorage(imageDataUrl, categoryId) {
        try {
            const saved = JSON.parse(localStorage.getItem('meatvision_active_learning') || '[]');
            saved.push({ image: imageDataUrl, category: categoryId });
            if (saved.length > 30) saved.shift();
            localStorage.setItem('meatvision_active_learning', JSON.stringify(saved));
        } catch (e) {}
    }

    async function loadKnnSamplesFromStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem('meatvision_active_learning') || '[]');
            for (const s of saved) {
                await trainSampleFromImage(s.image, s.category, false);
            }
            // Also train model on custom sample test images in gallery!
            for (const sample of customSamples) {
                await trainSampleFromImage(sample.image, sample.categoryId, false);
            }
        } catch (e) {}
    }

    async function trainSampleFromImage(imgElementOrUrl, categoryId, saveToStorage = true) {
        if (!knnMeatClassifier || !mobilenetModel) return false;
        try {
            let img = imgElementOrUrl;
            let dataUrl = typeof imgElementOrUrl === 'string' ? imgElementOrUrl : null;
            if (typeof imgElementOrUrl === 'string') {
                img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = imgElementOrUrl;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
            } else if (imgElementOrUrl instanceof HTMLImageElement && saveToStorage) {
                try {
                    const c = document.createElement('canvas');
                    c.width = imgElementOrUrl.naturalWidth || 224;
                    c.height = imgElementOrUrl.naturalHeight || 224;
                    const ctx = c.getContext('2d');
                    ctx.drawImage(imgElementOrUrl, 0, 0);
                    dataUrl = c.toDataURL('image/jpeg', 0.85);
                } catch(e){}
            }

            // Train full image embedding
            const activation = mobilenetModel.infer(img, true);
            knnMeatClassifier.addExample(activation, categoryId);
            activation.dispose();

            // Train center crop embedding
            const c = document.createElement('canvas');
            const ctx = c.getContext('2d');
            c.width = 224; c.height = 224;
            const cw = img.width * 0.7 || 224, ch = img.height * 0.7 || 224;
            const sx = (img.width - cw) / 2 || 0, sy = (img.height - ch) / 2 || 0;
            ctx.drawImage(img, sx, sy, cw, ch, 0, 0, 224, 224);
            const cropAct = mobilenetModel.infer(c, true);
            knnMeatClassifier.addExample(cropAct, categoryId);
            cropAct.dispose();

            sampleCounts[categoryId] = (sampleCounts[categoryId] || 0) + 2;
            updateTrainerModalSampleCounts();

            if (saveToStorage && dataUrl) {
                saveKnnSampleToStorage(dataUrl, categoryId);
            }
            return true;
        } catch (e) {
            console.log('Training sample error:', e);
            return false;
        }
    }

    function updateTrainerModalSampleCounts() {
        let total = 0;
        defaultCatalog.forEach(cat => {
            const count = sampleCounts[cat.id] || 0;
            total += count;
            const el = document.getElementById(`${cat.id}-sample-count`);
            if (el) el.textContent = `${count} Trained Sample${count === 1 ? '' : 's'}`;
        });
        const totalEl = document.getElementById('total-samples-count');
        if (totalEl) totalEl.textContent = `${total} Total Calibrated Samples`;
    }

    async function analyzeCustomImage(imgUrl, filename = '', isLiveStream = false) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imgUrl;

        img.onload = async () => {
            let detectedItem = null;
            let confVal = '98.5%';
            let isUnrecognized = false;

            // Priority 1: Filename Keyword Signals
            const lowerName = (filename || '').toLowerCase();
            if (lowerName.includes('chicken') || lowerName.includes('poultry') || lowerName.includes('hen') || lowerName.includes('breast') || lowerName.includes('curry')) {
                detectedItem = defaultCatalog.find(i => i.id === 'chicken');
                confVal = '99.2% (Meta Signal)';
            } else if (lowerName.includes('mutton') || lowerName.includes('goat') || lowerName.includes('lamb') || lowerName.includes('pork') || lowerName.includes('beef')) {
                detectedItem = defaultCatalog.find(i => i.id === 'goat');
                confVal = '99.0% (Meta Signal)';
            } else if (lowerName.includes('fish') || lowerName.includes('pomfret') || lowerName.includes('rohu') || lowerName.includes('salmon') || lowerName.includes('katla') || lowerName.includes('fillet')) {
                detectedItem = defaultCatalog.find(i => i.id === 'fish');
                confVal = '99.4% (Meta Signal)';
            } else if (lowerName.includes('prawn') || lowerName.includes('shrimp') || lowerName.includes('lobster') || lowerName.includes('prawns')) {
                detectedItem = defaultCatalog.find(i => i.id === 'prawns');
                confVal = '98.9% (Meta Signal)';
            }

            // Priority 2: Deep Learning Neural Feature Extractor & Multi-Crop KNN Ensemble
            if (!detectedItem && isKnnReady && knnMeatClassifier && knnMeatClassifier.getNumClasses() > 0) {
                try {
                    // Full frame prediction
                    const fullAct = mobilenetModel.infer(img, true);
                    const pred1 = await knnMeatClassifier.predictClass(fullAct, 3);
                    fullAct.dispose();

                    // Center 65% scale-focused crop prediction
                    const centerCanvas = document.createElement('canvas');
                    const cctx = centerCanvas.getContext('2d');
                    centerCanvas.width = 224; centerCanvas.height = 224;
                    const cropW = img.width * 0.65;
                    const cropH = img.height * 0.65;
                    cctx.drawImage(img, (img.width - cropW) / 2, (img.height - cropH) / 2, cropW, cropH, 0, 0, 224, 224);
                    
                    const centerAct = mobilenetModel.infer(centerCanvas, true);
                    const pred2 = await knnMeatClassifier.predictClass(centerAct, 3);
                    centerAct.dispose();

                    // Aggregate weighted ensemble scores
                    const aggregateScores = { goat: 0, chicken: 0, fish: 0, prawns: 0 };
                    if (pred1 && pred1.confidences) {
                        for (const k in pred1.confidences) aggregateScores[k] = (aggregateScores[k] || 0) + pred1.confidences[k] * 0.45;
                    }
                    if (pred2 && pred2.confidences) {
                        for (const k in pred2.confidences) aggregateScores[k] = (aggregateScores[k] || 0) + pred2.confidences[k] * 0.55;
                    }

                    let bestClass = null;
                    let bestScore = 0;
                    for (const k in aggregateScores) {
                        if (aggregateScores[k] > bestScore) {
                            bestScore = aggregateScores[k];
                            bestClass = k;
                        }
                    }

                    if (bestClass && bestScore >= 0.28) {
                        detectedItem = defaultCatalog.find(i => i.id === bestClass);
                        confVal = Math.min(99.4, Math.max(92.0, bestScore * 100)).toFixed(1) + '% (Deep Feature)';
                    }
                } catch (e) {
                    console.log('KNN ensemble prediction fallback:', e);
                }
            }

            // Priority 3: Robust Multi-Channel Spectral & Texture Vision Classifier
            if (!detectedItem) {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const size = 160;
                    canvas.width = size;
                    canvas.height = size;
                    ctx.drawImage(img, 0, 0, size, size);

                    const imgData = ctx.getImageData(0, 0, size, size);
                    const data = imgData.data;

                    let paleChickenScore = 0;
                    let crimsonMuttonScore = 0;
                    let fatMarrowScore = 0;
                    let silverFishScore = 0;
                    let rawPrawnGreyScore = 0;
                    let cookedPrawnOrangeScore = 0;
                    let validPixels = 0;
                    let textureEdges = 0;

                    // Central 70% ROI boundary to ignore weighing scale borders/trays
                    const margin = Math.floor(size * 0.15);
                    const startY = margin, endY = size - margin;
                    const startX = margin, endX = size - margin;

                    for (let y = startY; y < endY; y++) {
                        for (let x = startX; x < endX; x++) {
                            const i = (y * size + x) * 4;
                            const r = data[i];
                            const g = data[i + 1];
                            const b = data[i + 2];

                            const max = Math.max(r, g, b);
                            const min = Math.min(r, g, b);
                            const delta = max - min;
                            const v = max / 255.0;
                            const s = max === 0 ? 0 : delta / max;

                            // Filter plastic specular glare & bright scale background
                            if (s < 0.08 && v > 0.88) continue;
                            if (v < 0.08) continue;

                            validPixels++;

                            // Micro-texture edge detection
                            if (x < endX - 1) {
                                const iRight = (y * size + (x + 1)) * 4;
                                const diff = Math.abs(r - data[iRight]) + Math.abs(g - data[iRight+1]) + Math.abs(b - data[iRight+2]);
                                if (diff > 35) textureEdges++;
                            }

                            const rgDiff = Math.abs(r - g);
                            const gbDiff = Math.abs(g - b);
                            const rbDiff = Math.abs(r - b);

                            // 1. RAW PRAWNS / SHRIMP (Translucent Grey Shell & Segmented Shell Hues)
                            if (rgDiff < 28 && gbDiff < 28 && rbDiff < 28 && s >= 0.03 && s <= 0.38 && v >= 0.20 && v <= 0.78) {
                                rawPrawnGreyScore++;
                            } else if (r > 125 && g >= 65 && g <= 165 && b < 130 && r > b * 1.25 && s >= 0.18) {
                                cookedPrawnOrangeScore++;
                            }

                            // 2. GOAT MEAT / MUTTON (Deep Crimson Red Muscle Tissue + Fat Marbling)
                            else if (r > 80 && r > g * 1.15 && r > b * 1.15 && (g / (r + 1)) < 0.54) {
                                crimsonMuttonScore++;
                            } else if (r > 170 && g > 160 && b > 150 && s < 0.18 && v > 0.65) {
                                fatMarrowScore++;
                            }

                            // 3. CHICKEN MEAT (Pale Pink / Peach Raw Flesh Tone)
                            else if (r > 110 && g > 80 && b > 70 && r >= g && r >= b && (g / (r + 1)) >= 0.52 && (b / (r + 1)) >= 0.42 && v >= 0.36) {
                                paleChickenScore++;
                            }

                            // 4. FRESH FISH (Silvery Scales, Metallic Sheen, Grey Skin & Pink Fillets)
                            else if ((s < 0.24 && v > 0.18 && v < 0.88 && r <= g * 1.18) || (delta < 28 && v > 0.18 && v < 0.75)) {
                                silverFishScore++;
                            }
                        }
                    }

                    const norm = validPixels || 1;
                    const rawPrawnTotal = (rawPrawnGreyScore * 1.5 + cookedPrawnOrangeScore * 1.3) / norm;
                    const muttonTotal = (crimsonMuttonScore * 1.6 + fatMarrowScore * 0.4) / norm;
                    const chickenTotal = (paleChickenScore * 1.8) / norm;
                    const fishTotal = (silverFishScore * 1.5) / norm;

                    const edgeRatio = textureEdges / norm;

                    const scores = {
                        prawns: rawPrawnTotal + (edgeRatio > 0.15 ? 0.12 : 0),
                        goat: muttonTotal,
                        chicken: chickenTotal,
                        fish: fishTotal + (edgeRatio > 0.18 ? 0.10 : 0)
                    };

                    let topClass = null;
                    let topVal = 0;
                    for (const catId in scores) {
                        if (scores[catId] > topVal) {
                            topVal = scores[catId];
                            topClass = catId;
                        }
                    }

                    if (topVal >= 0.08 && topClass) {
                        detectedItem = defaultCatalog.find(i => i.id === topClass);
                        confVal = Math.min(99.4, Math.max(92.5, 90 + topVal * 30)).toFixed(1) + '% (Vision Spectrum)';
                    } else {
                        isUnrecognized = true;
                    }
                } catch (err) {
                    isUnrecognized = true;
                }
            }

            if (isUnrecognized || !detectedItem) {
                const unrecognizedItem = {
                    id: 'chicken',
                    name: `⚠️ Unrecognized Meat / Image`,
                    category: 'Not in Catalog',
                    defaultPrice: currentPrices['chicken'] || 240,
                    image: imgUrl,
                    texture: 'Uncertain Feature Match',
                    color: 'Non-Standard Profile',
                    confidence: 'Low Feature Match',
                    isUnrecognized: true,
                    detectedLabel: 'Unrecognized Image'
                };
                document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
                selectItem(unrecognizedItem, imgUrl);
                return;
            }

            const customItemObj = {
                id: detectedItem.id,
                name: detectedItem.name,
                category: detectedItem.category,
                defaultPrice: currentPrices[detectedItem.id] || detectedItem.defaultPrice,
                image: imgUrl,
                texture: detectedItem.texture,
                color: detectedItem.color,
                confidence: confVal
            };

            aiDetectedItem = detectedItem;
            
            const bboxClass = document.getElementById('bbox-class');
            const bboxConf = document.getElementById('bbox-conf');
            const bboxOverlay = document.getElementById('bbox-overlay');
            const detectedItemName = document.getElementById('detected-item-name');

            if (bboxClass) bboxClass.textContent = detectedItem.name;
            if (bboxConf) bboxConf.textContent = confVal;
            if (detectedItemName) detectedItemName.textContent = detectedItem.name;
            if (bboxOverlay) bboxOverlay.classList.remove('hidden');

            if (!selectedItem) {
                document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
                selectItem(customItemObj, imgUrl);
            } else {
                checkFraudMismatch(selectedItem, aiDetectedItem);
                updatePOSCalculation();
            }

            if (isLiveStream) {
                pauseCameraFeedOnDetection();
            }
        };

        img.onerror = () => {
            let matchedItem = defaultCatalog[1];
            document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
            selectItem(matchedItem, imgUrl);
        };
    }

    function checkFraudMismatch(selected, detected) {
        const fraudBanner = document.getElementById('fraud-alert-banner');
        const fraudText = document.getElementById('fraud-alert-text');
        const bboxMatchHud = document.getElementById('bbox-match-hud');

        if (!selected || !detected) {
            if (fraudBanner) fraudBanner.classList.add('hidden');
            if (bboxMatchHud) {
                bboxMatchHud.innerHTML = '⚡ Auto-Detect: Keep item steady in front of camera';
                bboxMatchHud.style.background = 'rgba(15, 23, 42, 0.92)';
                bboxMatchHud.style.borderColor = '#10b981';
            }
            return;
        }

        if (selected.id !== detected.id && !selected.isUnrecognized && !detected.isUnrecognized) {
            const selPrice = currentPrices[selected.id] || selected.defaultPrice;
            const detPrice = currentPrices[detected.id] || detected.defaultPrice;

            if (fraudBanner) {
                fraudBanner.classList.remove('hidden');
                if (fraudText) {
                    fraudText.innerHTML = `Selected <strong>${selected.name}</strong> (₹${selPrice}/kg), but Camera detected <strong>${detected.name}</strong> (₹${detPrice}/kg)!`;
                }
            }
            if (bboxMatchHud) {
                bboxMatchHud.innerHTML = `⚠️ MISMATCH DETECTED: Selected ${selected.name} != Camera ${detected.name}`;
                bboxMatchHud.style.background = 'rgba(239, 68, 68, 0.95)';
                bboxMatchHud.style.borderColor = '#ef4444';
            }
        } else {
            if (fraudBanner) fraudBanner.classList.add('hidden');
            if (bboxMatchHud) {
                bboxMatchHud.innerHTML = `✅ MATCH CONFIRMED: ${selected.name} matches camera scan`;
                bboxMatchHud.style.background = 'rgba(5, 150, 105, 0.95)';
                bboxMatchHud.style.borderColor = '#10b981';
            }
        }
    }

    let activeTrainerCategory = 'goat';

    function renderTrainerCategoryTabs() {
        const tabsContainer = document.getElementById('trainer-category-tabs');
        if (!tabsContainer) return;
        tabsContainer.innerHTML = '';

        const allCats = getAllCategories();
        if (!allCats.some(c => c.id === activeTrainerCategory)) {
            activeTrainerCategory = allCats[0]?.id || 'chicken';
        }

        allCats.forEach(cat => {
            const samples = categorySamplesMap[cat.id] || [];
            const count = samples.length;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'trainer-tab-btn' + (activeTrainerCategory === cat.id ? ' active' : '');
            btn.dataset.category = cat.id;
            btn.innerHTML = `
                <span class="tab-emoji">${cat.emoji || '📦'}</span>
                <span class="tab-label">${cat.name}</span>
                <span class="tab-count-badge" id="tab-count-${cat.id}">${count} Photo${count === 1 ? '' : 's'}</span>
            `;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.trainer-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeTrainerCategory = cat.id;
                renderTrainerGalleries();
            });

            tabsContainer.appendChild(btn);
        });
    }

    function renderTrainerGalleries() {
        renderTrainerCategoryTabs();

        // 1. Update Active Category Title & Description
        const titleEl = document.getElementById('active-category-title');
        const descEl = document.getElementById('active-category-desc');
        const catObj = getAllCategories().find(c => c.id === activeTrainerCategory) || defaultCatalog[0];
        
        if (titleEl) titleEl.textContent = `${catObj.emoji || '📦'} ${catObj.name} Sample Photos`;
        if (descEl) descEl.textContent = catObj.desc || `Calibrated sample photos for ${catObj.name}`;

        // 2. Render Large Photos in Active Gallery Grid
        const galleryEl = document.getElementById('trainer-active-gallery');
        if (!galleryEl) return;
        galleryEl.innerHTML = '';

        const samples = categorySamplesMap[activeTrainerCategory] || [];

        if (samples.length === 0) {
            galleryEl.innerHTML = `<div class="trainer-gallery-empty" style="grid-column:1/-1; padding:30px; text-align:center; color:var(--text-muted); background:var(--bg-input); border-radius:8px; border:1px dashed var(--border-color);">No sample photos uploaded for this category yet. Click "Upload New Photos" or "Snap Live Camera Photo" above!</div>`;
            return;
        }

        samples.forEach((sample, index) => {
            const card = document.createElement('div');
            card.className = 'trainer-large-card';
            card.innerHTML = `
                <div class="trainer-card-img-wrap">
                    <img src="${sample.image}" class="trainer-card-img" alt="${activeTrainerCategory}" onerror="this.src='https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=400'">
                    <span class="trainer-sample-type-badge ${sample.isBase ? 'base' : 'custom'}">
                        ${sample.isBase ? '🌟 Baseline' : '📸 Custom Snap'}
                    </span>
                </div>
                <div class="trainer-card-footer">
                    <span class="sample-meta">Sample #${index + 1}</span>
                    <button class="btn-delete-sample" data-id="${sample.id}" type="button">
                        🗑️ Delete Photo
                    </button>
                </div>
            `;

            // Delete photo handler
            const btnDel = card.querySelector('.btn-delete-sample');
            btnDel.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete this photo from ${(catObj.name || activeTrainerCategory).toUpperCase()}?`)) {
                    categorySamplesMap[activeTrainerCategory] = categorySamplesMap[activeTrainerCategory].filter(s => s.id !== sample.id);
                    saveCategorySamplesToStorage();

                    // Retrain KNN model for this category
                    if (knnMeatClassifier && mobilenetModel) {
                        knnMeatClassifier.clearClass(activeTrainerCategory);
                        sampleCounts[activeTrainerCategory] = 0;
                        for (const s of (categorySamplesMap[activeTrainerCategory] || [])) {
                            await trainSampleFromImage(s.image, activeTrainerCategory, false);
                        }
                    }
                    renderTrainerGalleries();
                    updateTrainerModalSampleCounts();
                }
            });

            galleryEl.appendChild(card);
        });

        updateTrainerModalSampleCounts();
    }

    function setupTrainerModal() {
        const trainerModal = document.getElementById('trainer-modal');
        const btnOpenTrainer = document.getElementById('btn-open-trainer');
        const btnCloseTrainerModal = document.getElementById('btn-close-trainer-modal');
        const btnCloseTrainerModalFooter = document.getElementById('btn-close-trainer-modal-footer');
        const btnResetAiModel = document.getElementById('btn-reset-ai-model');

        // Active File Upload Input Handler
        const activeTrainerFileInput = document.getElementById('active-trainer-file-input');
        if (activeTrainerFileInput) {
            activeTrainerFileInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;

                let successCount = 0;
                for (const file of files) {
                    const reader = new FileReader();
                    await new Promise((resolve) => {
                        reader.onload = async (evt) => {
                            const dataUrl = evt.target.result;
                            const res = await trainSampleFromImage(dataUrl, activeTrainerCategory);
                            if (res) {
                                successCount++;
                                if (!categorySamplesMap[activeTrainerCategory]) categorySamplesMap[activeTrainerCategory] = [];
                                categorySamplesMap[activeTrainerCategory].push({
                                    id: 'custom_' + Date.now() + '_' + Math.random(),
                                    image: dataUrl,
                                    isBase: false
                                });
                            }
                            resolve();
                        };
                        reader.readAsDataURL(file);
                    });
                }
                saveCategorySamplesToStorage();
                playBeep('success');
                renderTrainerGalleries();
                alert(`✅ Successfully added ${successCount} new photo(s) to ${activeTrainerCategory.toUpperCase()}!`);
                activeTrainerFileInput.value = '';
            });
        }

        // Active Snap from Camera Handler
        const btnActiveTrainerSnap = document.getElementById('btn-active-trainer-snap');
        if (btnActiveTrainerSnap) {
            btnActiveTrainerSnap.addEventListener('click', async () => {
                const webcamFeed = document.getElementById('webcam-feed');

                if (!webcamStream || !webcamFeed || webcamFeed.videoWidth === 0) {
                    alert('Camera is currently OFF. Please click "Upload New Photos" or turn ON the camera on the POS screen first!');
                    return;
                }

                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 300;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(webcamFeed, 0, 0, canvas.width, canvas.height);
                const snapshotUrl = canvas.toDataURL('image/jpeg', 0.92);

                const res = await trainSampleFromImage(snapshotUrl, activeTrainerCategory);
                if (res) {
                    if (!categorySamplesMap[activeTrainerCategory]) categorySamplesMap[activeTrainerCategory] = [];
                    categorySamplesMap[activeTrainerCategory].push({
                        id: 'custom_' + Date.now() + '_' + Math.random(),
                        image: snapshotUrl,
                        isBase: false
                    });
                    saveCategorySamplesToStorage();
                    playBeep('success');
                    renderTrainerGalleries();
                    alert(`📸 Live camera photo successfully snapped and added to ${activeTrainerCategory.toUpperCase()}!`);
                }
            });
        }

        if (btnOpenTrainer && trainerModal) {
            btnOpenTrainer.addEventListener('click', () => {
                renderTrainerGalleries();
                trainerModal.classList.remove('hidden');
            });
        }
        const btnCancelTrainerModal = document.getElementById('btn-cancel-trainer-modal');
        if (btnCancelTrainerModal && trainerModal) {
            btnCancelTrainerModal.addEventListener('click', () => trainerModal.classList.add('hidden'));
        }
        if (btnCloseTrainerModal && trainerModal) {
            btnCloseTrainerModal.addEventListener('click', () => trainerModal.classList.add('hidden'));
        }
        if (btnCloseTrainerModalFooter && trainerModal) {
            btnCloseTrainerModalFooter.addEventListener('click', () => trainerModal.classList.add('hidden'));
        }

        if (btnResetAiModel) {
            btnResetAiModel.addEventListener('click', async () => {
                if (confirm('Reset AI vision model to factory baseline sample set?')) {
                    localStorage.removeItem('meatvision_active_learning');
                    categorySamplesMap = {
                        goat: [
                            { id: 'base_goat_1', image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600', isBase: true },
                            { id: 'base_goat_2', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600', isBase: true },
                            { id: 'base_goat_3', image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=600', isBase: true },
                            { id: 'base_goat_4', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600', isBase: true }
                        ],
                        chicken: [
                            { id: 'base_chicken_1', image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600', isBase: true },
                            { id: 'base_chicken_2', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600', isBase: true },
                            { id: 'base_chicken_3', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600', isBase: true },
                            { id: 'base_chicken_4', image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600', isBase: true }
                        ],
                        fish: [
                            { id: 'base_fish_1', image: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=600', isBase: true },
                            { id: 'base_fish_2', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600', isBase: true },
                            { id: 'base_fish_3', image: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=600', isBase: true }
                        ],
                        prawns: [
                            { id: 'base_prawns_1', image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600', isBase: true },
                            { id: 'base_prawns_2', image: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=600', isBase: true },
                            { id: 'base_prawns_3', image: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600', isBase: true }
                        ]
                    };
                    if (knnMeatClassifier) {
                        knnMeatClassifier.clearAllClasses();
                        Object.keys(sampleCounts).forEach(k => sampleCounts[k] = 0);
                        await seedBaseMeatDataset();
                        renderTrainerGalleries();
                        alert('AI Model reset to factory baseline.');
                    }
                }
            });
        }
    }

    function fallbackClassification(imgUrl, filename = '') {
        let matchedItem = defaultCatalog[0];
        const lowerName = filename.toLowerCase();
        if (lowerName.includes('chicken')) matchedItem = defaultCatalog[1];
        else if (lowerName.includes('fish')) matchedItem = defaultCatalog[2];
        else if (lowerName.includes('prawn')) matchedItem = defaultCatalog[3];
        
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        selectItem(matchedItem, imgUrl);
    }

    // ----------------------------------------------------------------------
    // 6. Weight Scale Simulation & Control
    // ----------------------------------------------------------------------
    const inputManualWeight = document.getElementById('input-manual-weight');

    function setupScaleListeners() {
        function applyWeightChange(val, updateInputBox = true) {
            if (isScaleHold) return;
            const parsed = parseFloat(val);
            if (!isNaN(parsed) && parsed >= 0) {
                currentWeight = parsed;
                if (weightSlider) weightSlider.value = currentWeight;
                if (weightDigits) weightDigits.textContent = currentWeight.toFixed(3);
                if (invWeight) invWeight.textContent = currentWeight.toFixed(3) + ' kg';
                if (updateInputBox && inputManualWeight && document.activeElement !== inputManualWeight) {
                    inputManualWeight.value = currentWeight.toFixed(3);
                }
                updatePOSCalculation();

                // If item is placed on the weight machine and sample is selected, trigger live scan!
                if (webcamStream && currentWeight > 0.05 && isCameraPaused) {
                    resumeCameraStream();
                }
            }
        }

        if (weightSlider) {
            weightSlider.addEventListener('input', (e) => {
                applyWeightChange(e.target.value, true);
            });
        }

        if (inputManualWeight) {
            const onManualInput = (e) => applyWeightChange(e.target.value, false);
            inputManualWeight.addEventListener('input', onManualInput);
            inputManualWeight.addEventListener('change', onManualInput);
            inputManualWeight.addEventListener('keyup', onManualInput);
        }

        document.querySelectorAll('.quick-weight-btns .btn-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                applyWeightChange(btn.dataset.weight, true);
                if (inputManualWeight) inputManualWeight.value = parseFloat(btn.dataset.weight).toFixed(3);
            });
        });

        if (btnTare) {
            btnTare.addEventListener('click', async () => {
                applyWeightChange(0.00, true);
                if (inputManualWeight) inputManualWeight.value = '0.000';
                try {
                    await fetch('/api/process-silo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ weight: 0.0, mac: 'LOAD-CELL-01', location: 'Tare Zero' })
                    });
                } catch(e) {}
            });
        }

        if (btnHold) {
            btnHold.addEventListener('click', () => {
                isScaleHold = !isScaleHold;
                if (isScaleHold) {
                    btnHold.classList.remove('btn-warning');
                    btnHold.classList.add('btn-emerald');
                    btnHold.textContent = 'Hold Active';
                    if (scaleModeBadge) {
                        scaleModeBadge.textContent = 'Weight Locked';
                        scaleModeBadge.className = 'badge badge-primary';
                    }
                } else {
                    btnHold.classList.remove('btn-emerald');
                    btnHold.classList.add('btn-warning');
                    btnHold.textContent = 'Hold Weight';
                    if (scaleModeBadge) {
                        scaleModeBadge.textContent = 'Live Scale Connected';
                        scaleModeBadge.className = 'badge badge-emerald';
                    }
                }
            });
        }
    }

    let liveScalePollInterval = null;

    function startLiveScalePolling() {
        if (liveScalePollInterval) clearInterval(liveScalePollInterval);

        async function fetchLiveWeight() {
            try {
                const res = await fetch('/api/live?t=' + Date.now());
                if (!res.ok) return;
                const data = await res.json();
                
                if (data && typeof data.weight !== 'undefined') {
                    const newWeight = parseFloat(data.weight);
                    
                    // Update scale indicator pill
                    const scaleStatusText = document.getElementById('scale-status-text');
                    const scaleModeBadge = document.getElementById('scale-mode-badge');
                    
                    if (scaleStatusText) {
                        scaleStatusText.textContent = `Scale: ${data.mac || data.location || 'IoT Connected'}`;
                    }
                    if (scaleModeBadge) {
                        scaleModeBadge.textContent = 'Live Scale (Counter Scale)';
                        scaleModeBadge.className = 'badge badge-emerald';
                    }

                    // If scale is not locked on hold and weight has changed
                    if (!isScaleHold && Math.abs(currentWeight - newWeight) > 0.005) {
                        currentWeight = newWeight;
                        if (weightSlider) weightSlider.value = currentWeight;
                        if (weightDigits) weightDigits.textContent = currentWeight.toFixed(3);
                        if (invWeight) invWeight.textContent = currentWeight.toFixed(3) + ' kg';
                        if (inputManualWeight && document.activeElement !== inputManualWeight) {
                            inputManualWeight.value = currentWeight.toFixed(3);
                        }
                        updatePOSCalculation();

                        // If item is placed on the scale (> 0.05kg), sample is selected, and camera was paused, auto-resume!
                        if (webcamStream && currentWeight > 0.05 && isCameraPaused) {
                            resumeCameraStream();
                        }
                    }
                }
            } catch(err) {
                // Polling retry silently
            }
        }

        // Poll every 500ms
        liveScalePollInterval = setInterval(fetchLiveWeight, 500);
        fetchLiveWeight();
    }

    function updateWeightDisplay() {
        if (weightDigits) weightDigits.textContent = currentWeight.toFixed(3);
        if (invWeight) invWeight.textContent = currentWeight.toFixed(3) + ' kg';
        if (inputManualWeight && document.activeElement !== inputManualWeight) {
            inputManualWeight.value = currentWeight.toFixed(3);
        }
        updatePOSCalculation();
    }

    // Extra Fee Elements & Editable Inputs
    const chkPackagingCharge = document.getElementById('chk-packaging-charge');
    const chkMarinationCharge = document.getElementById('chk-marination-charge');
    const selTaxRate = document.getElementById('sel-tax-rate');
    const packagingChargeAmt = document.getElementById('packaging-charge-amt');
    const marinationChargeAmt = document.getElementById('marination-charge-amt');
    const taxChargeAmt = document.getElementById('tax-charge-amt');

    const inputCuttingRate = document.getElementById('input-cutting-rate');
    const inputPackagingFee = document.getElementById('input-packaging-fee');
    const inputMarinationRate = document.getElementById('input-marination-rate');

    // ----------------------------------------------------------------------
    // 7. Order Calculation & Bill Generation
    // ----------------------------------------------------------------------
    let orderCart = [];
    const btnAddCart = document.getElementById('btn-add-cart');
    const btnClearCart = document.getElementById('btn-clear-cart');
    const btnViewCart = document.getElementById('btn-view-cart');
    const cartItemCount = document.getElementById('cart-item-count');
    const cartRunningTotal = document.getElementById('cart-running-total');

    function updateCartBar() {
        const count = orderCart.length;
        const total = orderCart.reduce((sum, i) => sum + i.total, 0);
        if (cartItemCount) cartItemCount.textContent = `${count} item${count === 1 ? '' : 's'} in order`;
        if (cartRunningTotal) cartRunningTotal.textContent = `Total: ${currencySymbol}${total.toFixed(2)}`;
    }

    if (btnAddCart) {
        btnAddCart.addEventListener('click', () => {
            const itemRate = currentPrices[selectedItem.id] || selectedItem.defaultPrice || 750;
            const itemTotal = currentWeight * itemRate;
            orderCart.push({
                id: selectedItem.id,
                name: selectedItem.name,
                weight: currentWeight,
                rate: itemRate,
                total: itemTotal
            });
            updateCartBar();
            playBeep('success');
            alert(`✅ Added ${currentWeight.toFixed(3)}kg of ${selectedItem.name} (₹${itemTotal.toFixed(2)}) to current order!`);
        });
    }

    if (btnClearCart) {
        btnClearCart.addEventListener('click', () => {
            orderCart = [];
            updateCartBar();
            playBeep('scan');
        });
    }

    if (btnViewCart) {
        btnViewCart.addEventListener('click', () => {
            if (orderCart.length === 0) {
                alert('Current bill order is empty. Select item and click "Add Item to Bill Order".');
                return;
            }
            let summary = '📋 Current Order Summary:\n\n';
            let grandTotal = 0;
            orderCart.forEach((item, idx) => {
                summary += `${idx + 1}. ${item.name} - ${item.weight.toFixed(3)}kg @ ₹${item.rate}/kg = ₹${item.total.toFixed(2)}\n`;
                grandTotal += item.total;
            });
            summary += `\nGrand Total: ₹${grandTotal.toFixed(2)}`;
            alert(summary);
        });
    }

    function updatePOSCalculation() {
        const calcItemTitle = document.getElementById('calc-item-title');
        const calcUnitRate = document.getElementById('calc-unit-rate');
        const calcWeightVal = document.getElementById('calc-weight-val');
        const calcTotalPrice = document.getElementById('calc-total-price');
        const btnCheckout = document.getElementById('btn-checkout');

        if (!selectedItem) {
            if (calcItemTitle) calcItemTitle.textContent = 'None Selected (Waiting for Scan)';
            if (calcUnitRate) calcUnitRate.textContent = '₹0.00 / kg';
            if (calcWeightVal) calcWeightVal.textContent = `${currentWeight.toFixed(3)} kg`;
            if (calcTotalPrice) calcTotalPrice.textContent = '₹0.00';
            if (btnCheckout) btnCheckout.textContent = '💳 Generate Payment QR & Receipt (₹0.00)';
            return;
        }

        const itemRate = currentPrices[selectedItem.id] || selectedItem.defaultPrice || 780;
        const rawSubtotal = currentWeight * itemRate;

        // User Editable Cutting / Cleaning charge (custom ₹/kg)
        const cuttingRate = parseFloat(inputCuttingRate ? inputCuttingRate.value : 0) || 0;
        let cuttingFee = 0;
        if (chkCuttingCharge && chkCuttingCharge.checked) {
            cuttingFee = currentWeight * cuttingRate;
        }

        // User Editable Packaging fee (custom fixed ₹)
        const packagingRate = parseFloat(inputPackagingFee ? inputPackagingFee.value : 0) || 0;
        let packagingFee = 0;
        if (chkPackagingCharge && chkPackagingCharge.checked) {
            packagingFee = packagingRate;
        }

        // User Editable Marination charge (custom ₹/kg)
        const marinationRate = parseFloat(inputMarinationRate ? inputMarinationRate.value : 0) || 0;
        let marinationFee = 0;
        if (chkMarinationCharge && chkMarinationCharge.checked) {
            marinationFee = currentWeight * marinationRate;
        }

        // Tax / GST Calculation
        const taxRate = parseFloat(selTaxRate ? selTaxRate.value : 0) || 0;
        const taxableBase = rawSubtotal + cuttingFee + packagingFee + marinationFee;
        const taxFee = taxableBase * (taxRate / 100);

        const grandTotal = taxableBase + taxFee;
        const formattedTotal = grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Update pos.php elements safely
        if (calcItemTitle) calcItemTitle.textContent = selectedItem.name;
        if (calcUnitRate) calcUnitRate.textContent = `${currencySymbol}${itemRate.toFixed(2)} / kg`;
        if (calcWeightVal) calcWeightVal.textContent = `${currentWeight.toFixed(3)} kg`;
        if (calcTotalPrice) calcTotalPrice.textContent = `${currencySymbol}${formattedTotal}`;
        if (btnCheckout) btnCheckout.textContent = `💳 Generate Payment QR & Receipt (${currencySymbol}${formattedTotal})`;

        // Backwards compatibility for legacy IDs
        if (invItemName) invItemName.textContent = selectedItem.name;
        if (invItemCategory) invItemCategory.textContent = `Category: ${selectedItem.category}`;
        if (invRate) invRate.textContent = `${currencySymbol}${itemRate.toFixed(2)} / kg`;
        if (invSubtotal) invSubtotal.textContent = `${currencySymbol}${rawSubtotal.toFixed(2)}`;

        if (cuttingChargeAmt) cuttingChargeAmt.textContent = `${currencySymbol}${cuttingFee.toFixed(2)}`;
        if (packagingChargeAmt) packagingChargeAmt.textContent = `${currencySymbol}${packagingFee.toFixed(2)}`;
        if (marinationChargeAmt) marinationChargeAmt.textContent = `${currencySymbol}${marinationFee.toFixed(2)}`;
        if (taxChargeAmt) taxChargeAmt.textContent = `${currencySymbol}${taxFee.toFixed(2)}`;

        if (grandTotalDisplay) grandTotalDisplay.textContent = `${currencySymbol}${formattedTotal}`;
        if (qrTotalAmt) qrTotalAmt.textContent = `${currencySymbol}${formattedTotal}`;
    }

    if (chkCuttingCharge) chkCuttingCharge.addEventListener('change', updatePOSCalculation);
    if (chkPackagingCharge) chkPackagingCharge.addEventListener('change', updatePOSCalculation);
    if (chkMarinationCharge) chkMarinationCharge.addEventListener('change', updatePOSCalculation);
    if (selTaxRate) selTaxRate.addEventListener('change', updatePOSCalculation);

    if (inputCuttingRate) inputCuttingRate.addEventListener('input', updatePOSCalculation);
    if (inputPackagingFee) inputPackagingFee.addEventListener('input', updatePOSCalculation);
    if (inputMarinationRate) inputMarinationRate.addEventListener('input', updatePOSCalculation);

    // ----------------------------------------------------------------------
    // 8. Dynamic Payment QR Code Generator (SVG Vanilla Matrix)
    // ----------------------------------------------------------------------
    function generatePaymentQR(amount) {
        const upiString = `upi://pay?pa=freshcraft@upi&pn=FreshCraft%20Meat%20Shop&am=${amount}&cu=INR`;
        const qrContainer = document.getElementById('qr-code-svg');
        qrContainer.innerHTML = createDummySVGQR(upiString);
    }

    // Responsive SVG QR code layout
    function createDummySVGQR(payload) {
        return `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#ffffff"/>
            <!-- Outer Markers -->
            <rect x="5" y="5" width="26" height="26" fill="#000000"/>
            <rect x="9" y="9" width="18" height="18" fill="#ffffff"/>
            <rect x="13" y="13" width="10" height="10" fill="#000000"/>

            <rect x="69" y="5" width="26" height="26" fill="#000000"/>
            <rect x="73" y="9" width="18" height="18" fill="#ffffff"/>
            <rect x="77" y="13" width="10" height="10" fill="#000000"/>

            <rect x="5" y="69" width="26" height="26" fill="#000000"/>
            <rect x="9" y="73" width="18" height="18" fill="#ffffff"/>
            <rect x="13" y="77" width="10" height="10" fill="#000000"/>

            <!-- Data Pattern Blocks -->
            <rect x="36" y="8" width="6" height="6" fill="#000"/>
            <rect x="46" y="8" width="6" height="6" fill="#000"/>
            <rect x="56" y="14" width="6" height="6" fill="#000"/>

            <rect x="8" y="36" width="6" height="6" fill="#000"/>
            <rect x="20" y="44" width="6" height="6" fill="#000"/>
            <rect x="38" y="38" width="8" height="8" fill="#000"/>
            <rect x="52" y="38" width="12" height="8" fill="#000"/>
            <rect x="70" y="38" width="8" height="8" fill="#000"/>

            <rect x="38" y="54" width="10" height="10" fill="#10b981"/>
            <rect x="54" y="54" width="8" height="8" fill="#000"/>
            <rect x="68" y="54" width="12" height="8" fill="#000"/>

            <rect x="38" y="70" width="8" height="16" fill="#000"/>
            <rect x="52" y="74" width="16" height="6" fill="#000"/>
            <rect x="72" y="74" width="14" height="14" fill="#000"/>
        </svg>
        `;
    }

    // ----------------------------------------------------------------------
    // 9. Modals & Hardware Scale Event Listeners
    // ----------------------------------------------------------------------
    function setupModalListeners() {
        const priceForm = document.getElementById('price-form');
        const btnCheckout = document.getElementById('btn-checkout');
        const qrCodeImg = document.getElementById('qr-code-img');
        const displayUpiId = document.getElementById('display-upi-id');
        const printableReceipt = document.getElementById('printable-receipt');
        const btnCloseQrFooter = document.getElementById('btn-close-qr-footer');

        // Shop Payment UPI & Custom Scanner Photo Setup Modal
        const btnOpenUpiMgr = document.getElementById('btn-open-upi-mgr');
        const btnCloseUpiModal = document.getElementById('btn-close-upi-modal');
        const upiModal = document.getElementById('upi-modal');
        const shopUpiVpaInput = document.getElementById('shop-upi-vpa-input');
        const btnSaveUpiVpa = document.getElementById('btn-save-upi-vpa');
        const shopScannerFileInput = document.getElementById('shop-scanner-file-input');
        const btnSnapShopScanner = document.getElementById('btn-snap-shop-scanner');
        const customScannerPreviewBox = document.getElementById('custom-scanner-preview-box');
        const customScannerPreviewImg = document.getElementById('custom-scanner-preview-img');
        const btnRemoveCustomScanner = document.getElementById('btn-remove-custom-scanner');
        const modeDynamicQr = document.getElementById('mode-dynamic-qr');
        const modeStandeePhoto = document.getElementById('mode-standee-photo');

        let customScannerPhoto = localStorage.getItem('meatvision_custom_scanner_photo') || null;
        let qrDisplayMode = localStorage.getItem('meatvision_qr_display_mode') || 'dynamic';

        function updateScannerSetupModalUI() {
            if (shopUpiVpaInput) shopUpiVpaInput.value = shopUpiId;
            if (customScannerPhoto) {
                if (customScannerPreviewBox) customScannerPreviewBox.style.display = 'block';
                if (customScannerPreviewImg) customScannerPreviewImg.src = customScannerPhoto;
            } else {
                if (customScannerPreviewBox) customScannerPreviewBox.style.display = 'none';
            }

            if (qrDisplayMode === 'standee' && customScannerPhoto) {
                if (modeStandeePhoto) modeStandeePhoto.checked = true;
            } else {
                if (modeDynamicQr) modeDynamicQr.checked = true;
            }
        }

        if (btnOpenUpiMgr && upiModal) {
            btnOpenUpiMgr.addEventListener('click', () => {
                updateScannerSetupModalUI();
                upiModal.classList.remove('hidden');
            });
        }

        if (btnCloseUpiModal && upiModal) {
            btnCloseUpiModal.addEventListener('click', () => upiModal.classList.add('hidden'));
        }

        // 1. Upload Standee Photo
        if (shopScannerFileInput) {
            shopScannerFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        customScannerPhoto = evt.target.result;
                        if (customScannerPreviewBox) customScannerPreviewBox.style.display = 'block';
                        if (customScannerPreviewImg) customScannerPreviewImg.src = customScannerPhoto;
                        if (modeStandeePhoto) modeStandeePhoto.checked = true;
                        qrDisplayMode = 'standee';
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // 2. Snap Standee Photo from Live Webcam
        if (btnSnapShopScanner) {
            btnSnapShopScanner.addEventListener('click', () => {
                const webcamFeed = document.getElementById('webcam-feed');
                if (!webcamStream || !webcamFeed || webcamFeed.videoWidth === 0) {
                    alert('Camera is currently OFF. Please turn ON the camera on the POS screen first or use "Choose Photo / Image"!');
                    return;
                }
                const canvas = document.createElement('canvas');
                canvas.width = 480;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(webcamFeed, 0, 0, canvas.width, canvas.height);
                customScannerPhoto = canvas.toDataURL('image/jpeg', 0.92);
                if (customScannerPreviewBox) customScannerPreviewBox.style.display = 'block';
                if (customScannerPreviewImg) customScannerPreviewImg.src = customScannerPhoto;
                if (modeStandeePhoto) modeStandeePhoto.checked = true;
                qrDisplayMode = 'standee';
                playBeep('success');
            });
        }

        // 3. Remove Custom Standee Photo
        if (btnRemoveCustomScanner) {
            btnRemoveCustomScanner.addEventListener('click', () => {
                customScannerPhoto = null;
                localStorage.removeItem('meatvision_custom_scanner_photo');
                if (customScannerPreviewBox) customScannerPreviewBox.style.display = 'none';
                if (modeDynamicQr) modeDynamicQr.checked = true;
                qrDisplayMode = 'dynamic';
                localStorage.setItem('meatvision_qr_display_mode', 'dynamic');
                alert('Custom scanner photo removed. Dynamic Amount QR will be displayed during checkout.');
            });
        }

        // 4. Save Settings
        if (btnSaveUpiVpa) {
            btnSaveUpiVpa.addEventListener('click', () => {
                if (shopUpiVpaInput && shopUpiVpaInput.value.trim()) {
                    shopUpiId = shopUpiVpaInput.value.trim();
                    localStorage.setItem('meatvision_shop_upi_id', shopUpiId);
                }
                if (customScannerPhoto) {
                    localStorage.setItem('meatvision_custom_scanner_photo', customScannerPhoto);
                } else {
                    localStorage.removeItem('meatvision_custom_scanner_photo');
                }

                if (modeStandeePhoto && modeStandeePhoto.checked && customScannerPhoto) {
                    qrDisplayMode = 'standee';
                } else {
                    qrDisplayMode = 'dynamic';
                }
                localStorage.setItem('meatvision_qr_display_mode', qrDisplayMode);

                playBeep('success');
                alert(`✅ Shop Payment Settings saved!\n• UPI ID: ${shopUpiId}\n• Scanner Display: ${qrDisplayMode === 'standee' ? 'Uploaded Standee Photo' : 'Dynamic Amount QR'}`);
                if (upiModal) upiModal.classList.add('hidden');
            });
        }

        // ----------------------------------------------------------------------
        // Owner Add Sample Photo & New Category Modal
        // ----------------------------------------------------------------------
        // ----------------------------------------------------------------------
        // Owner Add Sample Photo & Category Manager Modal
        // ----------------------------------------------------------------------
        const btnOpenSampleModal = document.getElementById('btn-open-sample-modal');
        const btnCloseSampleModal = document.getElementById('btn-close-sample-modal');
        const ownerSampleModal = document.getElementById('owner-sample-modal');
        const btnToggleNewCat = document.getElementById('btn-toggle-new-cat');
        const sampleModalCategory = document.getElementById('sample-modal-category');
        const btnModalEditCat = document.getElementById('btn-modal-edit-cat');
        const btnModalDeleteCat = document.getElementById('btn-modal-delete-cat');
        const newCategoryFields = document.getElementById('new-category-fields');
        const categoryFormTitle = document.getElementById('category-form-title');
        const btnCloseCatFields = document.getElementById('btn-close-cat-fields');
        const editCatIdInput = document.getElementById('edit-cat-id');
        const newCatNameInput = document.getElementById('new-cat-name');
        const newCatEmojiInput = document.getElementById('new-cat-emoji');
        const newCatPriceInput = document.getElementById('new-cat-price');
        const newCatDescInput = document.getElementById('new-cat-desc');
        const btnSaveCatDetails = document.getElementById('btn-save-cat-details');
        const btnSampleModalSnap = document.getElementById('btn-sample-modal-snap');
        const inputModalSampleFile = document.getElementById('input-modal-sample-file');
        const previewBox = document.getElementById('sample-modal-preview-box');
        const previewGallery = document.getElementById('sample-modal-preview-gallery');
        const btnSubmitSampleModal = document.getElementById('btn-submit-sample-modal');

        let pendingModalSamplePhotos = [];

        function populateSampleModalCategoryDropdown(selectId = null) {
            if (!sampleModalCategory) return;
            const previousVal = selectId || sampleModalCategory.value;
            sampleModalCategory.innerHTML = '';

            getAllCategories().forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = `${cat.emoji || '📦'} ${cat.name}`;
                sampleModalCategory.appendChild(opt);
            });

            if (previousVal && Array.from(sampleModalCategory.options).some(o => o.value === previousVal)) {
                sampleModalCategory.value = previousVal;
            } else if (sampleModalCategory.options.length > 0) {
                sampleModalCategory.selectedIndex = 0;
            }
        }

        function renderModalPreviews() {
            if (!previewGallery || !previewBox) return;
            if (pendingModalSamplePhotos.length === 0) {
                previewBox.style.display = 'none';
                previewGallery.innerHTML = '';
                return;
            }
            previewBox.style.display = 'block';
            previewGallery.innerHTML = '';
            pendingModalSamplePhotos.forEach((imgSrc, idx) => {
                const wrap = document.createElement('div');
                wrap.style.cssText = 'position:relative; display:inline-block;';
                wrap.innerHTML = `
                    <img src="${imgSrc}" style="width:58px; height:58px; object-fit:cover; border-radius:6px; border:1px solid var(--border-color);">
                    <button type="button" style="position:absolute; top:-6px; right:-6px; background:#ef4444; color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:11px; cursor:pointer; line-height:1; display:flex; align-items:center; justify-content:center;">&times;</button>
                `;
                wrap.querySelector('button').onclick = () => {
                    pendingModalSamplePhotos.splice(idx, 1);
                    renderModalPreviews();
                };
                previewGallery.appendChild(wrap);
            });
        }

        // Open Add New Category Form
        if (btnToggleNewCat) {
            btnToggleNewCat.addEventListener('click', () => {
                if (editCatIdInput) editCatIdInput.value = '';
                if (newCatNameInput) newCatNameInput.value = '';
                if (newCatEmojiInput) newCatEmojiInput.value = '';
                if (newCatPriceInput) newCatPriceInput.value = '200';
                if (newCatDescInput) newCatDescInput.value = '';
                if (categoryFormTitle) categoryFormTitle.innerHTML = '<span>➕ Create New Product Category</span>';
                if (newCategoryFields) newCategoryFields.style.display = 'block';
                if (newCatNameInput) newCatNameInput.focus();
            });
        }

        // Inline Edit Selected Category
        if (btnModalEditCat) {
            btnModalEditCat.addEventListener('click', () => {
                const selectedCatId = sampleModalCategory ? sampleModalCategory.value : null;
                if (!selectedCatId) return;
                const catObj = getAllCategories().find(c => c.id === selectedCatId);
                if (!catObj) return;

                if (editCatIdInput) editCatIdInput.value = catObj.id;
                if (newCatNameInput) newCatNameInput.value = catObj.name;
                if (newCatEmojiInput) newCatEmojiInput.value = catObj.emoji || '';
                if (newCatPriceInput) newCatPriceInput.value = currentPrices[catObj.id] || catObj.defaultPrice || 200;
                if (newCatDescInput) newCatDescInput.value = catObj.desc || '';
                if (categoryFormTitle) categoryFormTitle.innerHTML = `<span>✏️ Edit: ${catObj.emoji || '📦'} ${catObj.name}</span>`;
                if (newCategoryFields) newCategoryFields.style.display = 'block';
            });
        }

        // Inline Delete Selected Category
        if (btnModalDeleteCat) {
            btnModalDeleteCat.addEventListener('click', () => {
                const selectedCatId = sampleModalCategory ? sampleModalCategory.value : null;
                if (!selectedCatId) return;
                const catObj = getAllCategories().find(c => c.id === selectedCatId);
                if (!catObj) return;

                const isCustom = customCategories.some(c => c.id === selectedCatId);
                if (!isCustom) {
                    alert(`"${catObj.name}" is a default baseline meat category. You can alter its sample photos or price, or delete custom added items.`);
                    return;
                }
                deleteCategory(catObj.id, catObj.name);
            });
        }

        // Close Category Form
        if (btnCloseCatFields) {
            btnCloseCatFields.addEventListener('click', () => {
                if (newCategoryFields) newCategoryFields.style.display = 'none';
            });
        }

        // Save / Edit Category Details
        if (btnSaveCatDetails) {
            btnSaveCatDetails.addEventListener('click', () => {
                const editId = editCatIdInput ? editCatIdInput.value.trim() : '';
                const name = newCatNameInput ? newCatNameInput.value.trim() : '';
                const emoji = newCatEmojiInput ? newCatEmojiInput.value.trim() || '📦' : '📦';
                const price = newCatPriceInput ? parseFloat(newCatPriceInput.value) || 200 : 200;
                const desc = newCatDescInput ? newCatDescInput.value.trim() : '';

                if (!name) {
                    alert('Please enter an Item Name (e.g. Eggs / Country Eggs)!');
                    if (newCatNameInput) newCatNameInput.focus();
                    return;
                }

                if (editId) {
                    // Updating existing category
                    const customIdx = customCategories.findIndex(c => c.id === editId);
                    if (customIdx >= 0) {
                        customCategories[customIdx].name = name;
                        customCategories[customIdx].emoji = emoji;
                        customCategories[customIdx].defaultPrice = price;
                        customCategories[customIdx].desc = desc;
                    }
                    currentPrices[editId] = price;
                    savePrices();
                    saveCategorySamplesToStorage();
                    populateSampleModalCategoryDropdown(editId);
                    renderPresetGrid();
                    renderDailyPriceGrid();
                    renderTrainerCategoryTabs();
                    renderTrainerGalleries();
                    if (newCategoryFields) newCategoryFields.style.display = 'none';
                    playBeep('success');
                    alert(`✅ Category "${emoji} ${name}" updated successfully!`);
                } else {
                    // Creating new category
                    const newCatId = 'cat_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
                    const newCatObj = {
                        id: newCatId,
                        name: `${name}`,
                        category: 'Custom Product',
                        emoji: emoji,
                        defaultPrice: price,
                        image: pendingModalSamplePhotos[0] || 'assets/images/chicken_meat.jpg',
                        desc: desc || `Fresh ${name} samples`,
                        confidence: '98.5%'
                    };

                    customCategories.push(newCatObj);
                    currentPrices[newCatId] = price;
                    categorySamplesMap[newCatId] = [];

                    savePrices();
                    saveCategorySamplesToStorage();
                    populateSampleModalCategoryDropdown(newCatId);
                    renderPresetGrid();
                    renderDailyPriceGrid();
                    renderTrainerCategoryTabs();
                    renderTrainerGalleries();
                    if (newCategoryFields) newCategoryFields.style.display = 'none';
                    playBeep('success');
                    alert(`🎉 New Category "${emoji} ${name}" created!\nNow upload or snap sample photos below to calibrate the AI model.`);
                }
            });
        }

        if (btnOpenSampleModal && ownerSampleModal) {
            btnOpenSampleModal.addEventListener('click', () => {
                populateSampleModalCategoryDropdown();
                pendingModalSamplePhotos = [];
                renderModalPreviews();
                if (newCategoryFields) newCategoryFields.style.display = 'none';
                ownerSampleModal.classList.remove('hidden');
            });
        }

        if (btnCloseSampleModal && ownerSampleModal) {
            btnCloseSampleModal.addEventListener('click', () => ownerSampleModal.classList.add('hidden'));
        }

        if (btnSampleModalSnap) {
            btnSampleModalSnap.addEventListener('click', () => {
                const webcamFeed = document.getElementById('webcam-feed');
                if (!webcamStream || !webcamFeed || webcamFeed.videoWidth === 0) {
                    alert('Camera is currently OFF. Please click "Upload Photo(s)" or turn ON the camera on the POS screen first!');
                    return;
                }
                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 300;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(webcamFeed, 0, 0, canvas.width, canvas.height);
                const snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.90);
                pendingModalSamplePhotos.push(snapshotDataUrl);
                renderModalPreviews();
                playBeep('success');
            });
        }

        if (inputModalSampleFile) {
            inputModalSampleFile.addEventListener('change', (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                let loaded = 0;
                files.forEach(f => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        pendingModalSamplePhotos.push(evt.target.result);
                        loaded++;
                        if (loaded === files.length) {
                            renderModalPreviews();
                        }
                    };
                    reader.readAsDataURL(f);
                });
                inputModalSampleFile.value = '';
            });
        }

        if (btnSubmitSampleModal) {
            btnSubmitSampleModal.addEventListener('click', async () => {
                const catChoice = sampleModalCategory ? sampleModalCategory.value : null;
                if (!catChoice) {
                    alert('Please select a product category first!');
                    return;
                }

                if (pendingModalSamplePhotos.length === 0) {
                    alert('Please upload or snap at least 1 sample photo to add and train!');
                    return;
                }

                const catItem = getAllCategories().find(c => c.id === catChoice);
                const catName = catItem ? catItem.name : catChoice;

                if (!categorySamplesMap[catChoice]) categorySamplesMap[catChoice] = [];

                // Update category main image if custom
                const customCat = customCategories.find(c => c.id === catChoice);
                if (customCat && pendingModalSamplePhotos[0]) {
                    customCat.image = pendingModalSamplePhotos[0];
                }

                for (let i = 0; i < pendingModalSamplePhotos.length; i++) {
                    const imgUrl = pendingModalSamplePhotos[i];
                    categorySamplesMap[catChoice].push({
                        id: 'custom_' + catChoice + '_' + i + '_' + Date.now(),
                        image: imgUrl,
                        isBase: false
                    });
                    await trainSampleFromImage(imgUrl, catChoice, false);
                }

                saveCategorySamplesToStorage();
                renderPresetGrid();
                renderTrainerCategoryTabs();
                renderTrainerGalleries();
                if (ownerSampleModal) ownerSampleModal.classList.add('hidden');
                playBeep('success');
                alert(`✅ Added ${pendingModalSamplePhotos.length} new sample photo(s) to "${catName}"! AI vision model recalibrated.`);
            });
        }

        const btnCancelSampleModal = document.getElementById('btn-cancel-sample-modal');
        const btnCancelCatDetails = document.getElementById('btn-cancel-cat-details');

        if (btnCancelCatDetails) {
            btnCancelCatDetails.addEventListener('click', () => {
                if (newCategoryFields) newCategoryFields.style.display = 'none';
            });
        }

        if (btnCancelSampleModal && ownerSampleModal) {
            btnCancelSampleModal.addEventListener('click', () => {
                ownerSampleModal.classList.add('hidden');
            });
        }

        // Daily Prices Modal
        const btnOpenPriceMgr = document.getElementById('btn-open-price-mgr');
        const btnClosePriceModal = document.getElementById('btn-close-price-modal');
        const btnCancelPriceModal = document.getElementById('btn-cancel-price-modal');
        const priceModal = document.getElementById('price-modal');

        if (btnOpenPriceMgr) {
            btnOpenPriceMgr.addEventListener('click', () => {
                renderDailyPriceGrid();
                if (priceModal) priceModal.classList.remove('hidden');
            });
        }
        if (btnClosePriceModal) {
            btnClosePriceModal.addEventListener('click', () => {
                if (priceModal) priceModal.classList.add('hidden');
            });
        }
        if (btnCancelPriceModal) {
            btnCancelPriceModal.addEventListener('click', () => {
                if (priceModal) priceModal.classList.add('hidden');
            });
        }

        // UPI Modal Cancel
        const btnCancelUpiModal = document.getElementById('btn-cancel-upi-modal');
        if (btnCancelUpiModal && upiModal) {
            btnCancelUpiModal.addEventListener('click', () => {
                upiModal.classList.add('hidden');
            });
        }

        if (priceForm) {
            priceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const inputs = priceForm.querySelectorAll('input[type="number"]');
                inputs.forEach(inp => {
                    const catId = inp.dataset.id;
                    if (catId) {
                        currentPrices[catId] = parseFloat(inp.value) || 200;
                    }
                });

                savePrices();
                renderPresetGrid();
                if (selectedItem) {
                    selectItem(selectedItem);
                }
                updatePOSCalculation();
                if (priceModal) priceModal.classList.add('hidden');
                playBeep('success');
                alert('✅ Daily product rates saved and applied across POS!');
            });
        }

        // Payment QR & Receipt Modal Action
        const btnShowDynamicQr = document.getElementById('btn-show-dynamic-qr');
        const btnShowStandeeQr = document.getElementById('btn-show-standee-qr');
        const checkoutQrTabs = document.getElementById('checkout-qr-tabs');
        const qrHintText = document.getElementById('qr-hint-text');

        let activeCheckoutQrMode = qrDisplayMode;

        function renderCheckoutQRDisplay(rawTotal, itemName) {
            const upiPayload = `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent('FreshCraft Meat POS')}&am=${rawTotal}&cu=INR&tn=${encodeURIComponent('Order Bill ' + itemName)}`;
            const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayload)}`;

            if (checkoutQrTabs) {
                checkoutQrTabs.style.display = customScannerPhoto ? 'flex' : 'none';
            }

            if (activeCheckoutQrMode === 'standee' && customScannerPhoto) {
                if (qrCodeImg) qrCodeImg.src = customScannerPhoto;
                if (qrHintText) qrHintText.innerHTML = `🏪 Official Shop Counter Standee. Scan with <strong>Google Pay / PhonePe / Paytm</strong> and enter <strong>₹${rawTotal}</strong>.`;
                if (btnShowStandeeQr) {
                    btnShowStandeeQr.className = 'btn btn-emerald btn-sm';
                }
                if (btnShowDynamicQr) {
                    btnShowDynamicQr.className = 'btn btn-outline-sm btn-sm';
                }
            } else {
                if (qrCodeImg) qrCodeImg.src = dynamicQrUrl;
                if (qrHintText) qrHintText.innerHTML = `Scan with <strong>Google Pay, PhonePe, Paytm, or BHIM</strong> (Auto Amount: <strong>₹${rawTotal}</strong>)`;
                if (btnShowDynamicQr) {
                    btnShowDynamicQr.className = 'btn btn-emerald btn-sm';
                }
                if (btnShowStandeeQr) {
                    btnShowStandeeQr.className = 'btn btn-outline-sm btn-sm';
                }
            }
        }

        if (btnShowDynamicQr) {
            btnShowDynamicQr.addEventListener('click', () => {
                activeCheckoutQrMode = 'dynamic';
                const itemRate = currentPrices[selectedItem ? selectedItem.id : 'goat'] || 780;
                const rawTotal = (currentWeight * itemRate).toFixed(2);
                renderCheckoutQRDisplay(rawTotal, selectedItem ? selectedItem.name : 'Meat Order');
            });
        }

        if (btnShowStandeeQr) {
            btnShowStandeeQr.addEventListener('click', () => {
                activeCheckoutQrMode = 'standee';
                const itemRate = currentPrices[selectedItem ? selectedItem.id : 'goat'] || 780;
                const rawTotal = (currentWeight * itemRate).toFixed(2);
                renderCheckoutQRDisplay(rawTotal, selectedItem ? selectedItem.name : 'Meat Order');
            });
        }

        // ----------------------------------------------------------------------
        // Sequential Checkout: Slip First -> QR Scan -> Payment Success -> Print
        // ----------------------------------------------------------------------
        const btnGenerateQrFlow = document.getElementById('btn-generate-qr-flow');
        const btnCashPaidFlow = document.getElementById('btn-cash-paid-flow');
        const checkoutInitialActions = document.getElementById('checkout-initial-actions');
        const qrDisplaySection = document.getElementById('qr-display-section');
        const paymentSuccessBanner = document.getElementById('payment-success-banner');
        const checkoutModalTitle = document.getElementById('checkout-modal-title');

        if (btnCheckout) {
            btnCheckout.addEventListener('click', () => {
                if (!selectedItem) {
                    selectedItem = defaultCatalog[0];
                    selectItem(selectedItem);
                }
                const itemRate = currentPrices[selectedItem.id] || selectedItem.defaultPrice || 780;
                const rawTotal = (currentWeight * itemRate).toFixed(2);

                if (displayUpiId) displayUpiId.textContent = shopUpiId;
                if (qrTotalAmt) qrTotalAmt.textContent = `${currencySymbol}${rawTotal}`;

                activeCheckoutQrMode = qrDisplayMode;
                renderCheckoutQRDisplay(rawTotal, selectedItem.name);

                // 1. Render Compact 58mm/80mm Thermal Receipt Slip
                if (printableReceipt) {
                    const billNo = 'BILL-' + Math.floor(100000 + Math.random() * 900000);
                    const now = new Date();
                    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    printableReceipt.innerHTML = `
                        <div class="receipt-slip-header">
                            <h3>🏪 FRESHCRAFT MEAT</h3>
                            <p>Premium Quality Daily Cuts</p>
                            <p>${dateStr} | ${timeStr}</p>
                            <p style="font-weight:700;">Invoice: #${billNo}</p>
                        </div>
                        <div style="margin:6px 0; font-size:11.5px;">
                            <div class="receipt-slip-row">
                                <span><strong>Item:</strong></span>
                                <span>${selectedItem.emoji || ''} ${selectedItem.name}</span>
                            </div>
                            <div class="receipt-slip-row">
                                <span><strong>Net Weight:</strong></span>
                                <span><strong>${currentWeight.toFixed(3)} kg</strong></span>
                            </div>
                            <div class="receipt-slip-row">
                                <span><strong>Unit Rate:</strong></span>
                                <span>₹${itemRate.toFixed(2)} / kg</span>
                            </div>
                            <div class="receipt-slip-row" style="color:#059669; font-weight:700;">
                                <span>AI Scan:</span>
                                <span>${selectedItem.id === (aiDetectedItem ? aiDetectedItem.id : selectedItem.id) ? '✅ Verified Match' : '✔️ Confirmed'}</span>
                            </div>
                        </div>
                        <div class="receipt-slip-total">
                            <span>TOTAL AMOUNT:</span>
                            <span>₹${rawTotal}</span>
                        </div>
                        <div class="receipt-slip-footer">
                            <p style="margin:2px 0; font-weight:700;">Scan & Pay UPI: ${shopUpiId}</p>
                            <p style="margin:2px 0;">*** Thank you for shopping with us! ***</p>
                        </div>
                    `;
                }

                // Initial State: Show Bill Slip First, Hide QR and Print until requested
                if (checkoutModalTitle) checkoutModalTitle.textContent = '🧾 Customer Bill Slip';
                if (checkoutInitialActions) checkoutInitialActions.style.display = 'flex';
                if (qrDisplaySection) qrDisplaySection.style.display = 'none';
                if (paymentSuccessBanner) paymentSuccessBanner.style.display = 'none';
                if (btnPrintReceipt) btnPrintReceipt.style.display = 'none';

                if (paymentStatusBox) {
                    paymentStatusBox.className = 'payment-status-box pending';
                    paymentStatusBox.innerHTML = `<span class="status-dot pulse"></span><span>Status: Waiting for Customer Payment...</span>`;
                }

                if (qrModal) qrModal.classList.remove('hidden');
                playBeep('scan');
            });
        }

        // Step 2: Customer or Cashier clicks "Scan for UPI QR Code"
        if (btnGenerateQrFlow) {
            btnGenerateQrFlow.addEventListener('click', () => {
                if (checkoutInitialActions) checkoutInitialActions.style.display = 'none';
                if (qrDisplaySection) qrDisplaySection.style.display = 'block';
                if (checkoutModalTitle) checkoutModalTitle.textContent = '📲 Scan UPI QR Code to Pay';
                playBeep('scan');
            });
        }

        // Cash Settlement Flow
        if (btnCashPaidFlow) {
            btnCashPaidFlow.addEventListener('click', () => {
                if (checkoutInitialActions) checkoutInitialActions.style.display = 'none';
                if (qrDisplaySection) qrDisplaySection.style.display = 'none';
                if (paymentSuccessBanner) {
                    paymentSuccessBanner.style.display = 'block';
                    paymentSuccessBanner.innerHTML = '💵 Cash Payment Confirmed! Click "Print Customer Slip" below.';
                }
                if (checkoutModalTitle) checkoutModalTitle.textContent = '✅ Payment Completed';
                if (btnPrintReceipt) {
                    btnPrintReceipt.style.display = 'inline-flex';
                    btnPrintReceipt.focus();
                }
                playBeep('success');
            });
        }

        // Step 3: UPI Payment Confirmed / Received
        if (btnSimulatePaid) {
            btnSimulatePaid.addEventListener('click', () => {
                if (qrDisplaySection) qrDisplaySection.style.display = 'none';
                if (paymentSuccessBanner) {
                    paymentSuccessBanner.style.display = 'block';
                    paymentSuccessBanner.innerHTML = '🎉 UPI Payment Received Successfully! Click "Print Customer Slip" below.';
                }
                if (checkoutModalTitle) checkoutModalTitle.textContent = '✅ Payment Completed';
                if (btnPrintReceipt) {
                    btnPrintReceipt.style.display = 'inline-flex';
                    btnPrintReceipt.focus();
                }
                playBeep('success');
            });
        }

        if (btnCloseQrModal && qrModal) btnCloseQrModal.addEventListener('click', () => qrModal.classList.add('hidden'));
        if (btnCloseQrFooter && qrModal) btnCloseQrFooter.addEventListener('click', () => qrModal.classList.add('hidden'));

        // Direct 1-Page Thermal POS Receipt Slip Printer
        function printSlipDirectly() {
            const slipContent = printableReceipt ? printableReceipt.innerHTML : '';
            if (!slipContent) return;

            let printFrame = document.getElementById('pos-print-iframe');
            if (!printFrame) {
                printFrame = document.createElement('iframe');
                printFrame.id = 'pos-print-iframe';
                printFrame.style.position = 'fixed';
                printFrame.style.right = '0';
                printFrame.style.bottom = '0';
                printFrame.style.width = '0';
                printFrame.style.height = '0';
                printFrame.style.border = '0';
                document.body.appendChild(printFrame);
            }

            const doc = printFrame.contentWindow.document;
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>POS Receipt Slip</title>
                    <style>
                        @page {
                            size: 58mm auto;
                            margin: 0;
                        }
                        * {
                            box-sizing: border-box;
                            margin: 0;
                            padding: 0;
                        }
                        html, body {
                            width: 58mm;
                            max-width: 58mm;
                            margin: 0 auto;
                            padding: 3mm 2.5mm;
                            background: #fff;
                            color: #000;
                            font-family: 'Courier New', Courier, monospace;
                            font-size: 11px;
                            line-height: 1.3;
                        }
                        .receipt-slip-header {
                            text-align: center;
                            border-bottom: 1px dashed #000;
                            padding-bottom: 5px;
                            margin-bottom: 5px;
                        }
                        .receipt-slip-header h3 {
                            font-size: 13px;
                            font-weight: 900;
                            margin: 0 0 2px 0;
                        }
                        .receipt-slip-header p {
                            font-size: 9.5px;
                            margin: 1px 0;
                        }
                        .receipt-slip-row {
                            display: flex;
                            justify-content: space-between;
                            margin: 2.5px 0;
                            font-size: 10.5px;
                        }
                        .receipt-slip-total {
                            border-top: 1.5px dashed #000;
                            border-bottom: 1.5px dashed #000;
                            padding: 5px 0;
                            margin: 5px 0;
                            font-size: 13px;
                            font-weight: 900;
                            display: flex;
                            justify-content: space-between;
                        }
                        .receipt-slip-footer {
                            text-align: center;
                            font-size: 9.5px;
                            margin-top: 5px;
                        }
                    </style>
                </head>
                <body>
                    ${slipContent}
                </body>
                </html>
            `);
            doc.close();

            setTimeout(() => {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
            }, 300);
        }

        if (btnPrintReceipt) {
            btnPrintReceipt.addEventListener('click', () => {
                playBeep('scan');
                printSlipDirectly();
            });
        }

        // IoT Architecture Guide Modal
        if (btnOpenGuide && guideModal) btnOpenGuide.addEventListener('click', () => guideModal.classList.remove('hidden'));
        if (btnCloseGuideModal && guideModal) btnCloseGuideModal.addEventListener('click', () => guideModal.classList.add('hidden'));

        // Serial Scale Hardware Connector
        if (btnSerialConnect) {
            btnSerialConnect.addEventListener('click', async () => {
                if ('serial' in navigator) {
                    try {
                        const port = await navigator.serial.requestPort();
                        await port.open({ baudRate: 9600 });
                        if (scaleStatusText) scaleStatusText.textContent = 'Scale: USB Serial Connected';
                        if (scaleModeBadge) {
                            scaleModeBadge.textContent = 'Serial Hardware Live';
                            scaleModeBadge.className = 'badge badge-primary';
                        }
                    } catch (err) {
                        alert('Hardware Serial Connection cancelled or not available.');
                    }
                } else {
                    alert('Web Serial API is not supported in this browser version. Use Chrome or Edge for physical USB scale connectivity.');
                }
            });
        }
    }

    // Launch App
    init();
});
