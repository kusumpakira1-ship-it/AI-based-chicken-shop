/**
 * Sunfra Weight & Scale Monitoring Dashboard Engine
 * Vanilla ES6 JavaScript for index.php / public/index.php
 */

document.addEventListener('DOMContentLoaded', () => {
    let currentLogs = [];
    let deleteTargetId = null;

    // Toast Notification helper
    function showToast(message, type = 'info') {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconClass = 'fa-info-circle';
        if (type === 'success') iconClass = 'fa-check-circle';
        if (type === 'error') iconClass = 'fa-exclamation-triangle';

        toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fadeOut');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Format Date string for datetime-local input
    function formatDatetimeLocal(dateStr) {
        const d = dateStr ? new Date(dateStr) : new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // Update Header Clock
    function updateClock() {
        const timeEl = document.getElementById('current-time');
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = now.toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Fetch records from backend API
    async function fetchLogs() {
        try {
            const res = await fetch('/api/weights');
            if (res.ok) {
                currentLogs = await res.json();
                renderTable(currentLogs);
                updateStats(currentLogs);
                updateMacFilterOptions(currentLogs);
            }
        } catch (err) {
            console.warn('API fetch warning, using existing DOM table data:', err);
        }
    }

    // Update Stats Cards
    function updateStats(logs) {
        const statTotal = document.getElementById('stat-total');
        const statActive = document.getElementById('stat-active');
        const statAlerts = document.getElementById('stat-alerts');

        const uniqueMacs = new Set();
        let overweightCount = 0;

        logs.forEach(log => {
            if (log.mac) uniqueMacs.add(log.mac.toUpperCase());
            if (parseFloat(log.weight) > 100.0) overweightCount++;
        });

        if (statTotal) statTotal.textContent = uniqueMacs.size;
        if (statActive) statActive.textContent = uniqueMacs.size > 0 ? uniqueMacs.size : 0;
        if (statAlerts) statAlerts.textContent = overweightCount;
    }

    // Update MAC Address Filter Dropdown
    function updateMacFilterOptions(logs) {
        const selectMac = document.getElementById('filter-mac');
        if (!selectMac) return;

        const currentVal = selectMac.value;
        const uniqueMacs = Array.from(new Set(logs.map(l => l.mac?.toUpperCase()).filter(Boolean)));
        
        selectMac.innerHTML = '<option value="">All MAC Addresses</option>';
        uniqueMacs.forEach(mac => {
            const opt = document.createElement('option');
            opt.value = mac;
            opt.textContent = mac;
            if (mac === currentVal) opt.selected = true;
            selectMac.appendChild(opt);
        });
    }

    // Render Table Rows dynamically
    function renderTable(logs) {
        const tbody = document.getElementById('records-tbody');
        if (!tbody) return;

        if (logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fa-solid fa-scale-unbalanced"></i>
                        <p>No scale logs recorded yet. Add a scale or stream live telemetry.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = logs.map(row => {
            const weightVal = parseFloat(row.weight || 0);
            const hasWeight = weightVal > 0;
            const maxCap = 150.0;
            const percent = hasWeight ? Math.min(Math.round((weightVal / maxCap) * 100), 100) : 0;
            const weightText = hasWeight ? weightVal.toFixed(2) + ' kg' : '-';
            const percentText = hasWeight ? percent + '%' : '';

            let levelClass = 'normal';
            if (weightVal > 100.0) levelClass = 'danger';
            else if (weightVal > 75.0) levelClass = 'warning';

            const locParts = (row.location || 'Scale Device').split('/');
            const mainLoc = locParts[0].trim();
            const subLoc = locParts[1] ? locParts[1].trim() : 'Weighing station';
            const formattedMac = (row.mac || '').replace(/:/g, '-');

            return `
                <tr data-id="${row.id}">
                    <td class="row-timestamp">${row.timestamp || ''}</td>
                    <td>
                        <span class="mac-pill">
                            <i class="fa-solid fa-scale-unbalanced-stroke"></i> ${formattedMac}
                        </span>
                    </td>
                    <td>
                        <div class="location-cell">
                            <span class="location-title">${mainLoc}</span>
                            <span class="location-subtext"><i class="fa-solid fa-location-arrow"></i> ${subLoc}</span>
                        </div>
                    </td>
                    <td>
                        <div class="weight-cell">
                            <div class="progress-bar-container" ${!hasWeight ? 'style="opacity: 0.3;"' : ''}>
                                <div class="progress-bar-fill ${levelClass}" style="width: ${percent}%;"></div>
                            </div>
                            <div class="weight-meta">
                                <span class="weight-text-val">${weightText}</span>
                                <span class="weight-pct-val">${percentText}</span>
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
                            <button class="btn-action edit" onclick="triggerEdit('${row.id}')">
                                <i class="fa-solid fa-pencil"></i> Edit
                            </button>
                            <button class="btn-action delete" onclick="triggerDelete('${row.id}')">
                                <i class="fa-solid fa-trash-can"></i> Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Modal Control Helpers
    const formModal = document.getElementById('form-modal');
    const confirmModal = document.getElementById('confirm-modal');

    function openFormModal(isEdit = false, data = {}) {
        if (!formModal) return;
        
        const modalTitle = document.getElementById('modal-title');
        const editIndicator = document.getElementById('edit-indicator');
        const recordIdInput = document.getElementById('record-id');
        const macInput = document.getElementById('mac-address');
        const locationInput = document.getElementById('location');
        const weightInput = document.getElementById('weight-value');
        const timestampInput = document.getElementById('timestamp');
        const saveBtn = document.getElementById('save-btn');

        if (isEdit) {
            if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-pencil"></i> Edit Scale Telemetry';
            if (editIndicator) editIndicator.classList.remove('hidden');
            if (recordIdInput) recordIdInput.value = data.id || '';
            if (macInput) macInput.value = data.mac || '';
            if (locationInput) locationInput.value = data.location || '';
            if (weightInput) weightInput.value = data.weight || 0.00;
            if (timestampInput) timestampInput.value = formatDatetimeLocal(data.timestamp);
        } else {
            if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Log Scale Telemetry';
            if (editIndicator) editIndicator.classList.add('hidden');
            if (recordIdInput) recordIdInput.value = '';
            
            // Default pre-fills
            const sampleMacs = ['AA:BB:CC:11:22:33', '12:34:56:78:9A:BC', 'FE:DC:BA:98:76:54'];
            if (macInput) macInput.value = sampleMacs[Math.floor(Math.random() * sampleMacs.length)];
            if (locationInput) locationInput.value = 'Main Counter Scale / Station A';
            if (weightInput) weightInput.value = (Math.random() * 5 + 0.5).toFixed(2);
            if (timestampInput) timestampInput.value = formatDatetimeLocal();
        }

        if (saveBtn) saveBtn.disabled = false;
        formModal.classList.add('active');
    }

    function closeFormModal() {
        if (formModal) formModal.classList.remove('active');
    }

    function openConfirmModal(id) {
        deleteTargetId = id;
        if (confirmModal) confirmModal.classList.add('active');
    }

    function closeConfirmModal() {
        deleteTargetId = null;
        if (confirmModal) confirmModal.classList.remove('active');
    }

    // Global Edit / Delete handlers for inline onclick attribute in table buttons
    window.triggerEdit = function(id) {
        const record = currentLogs.find(l => String(l.id) === String(id));
        if (record) {
            openFormModal(true, record);
        } else {
            // Fallback: Read row data directly from DOM if record not in JS memory
            const row = document.querySelector(`tr[data-id="${id}"]`);
            if (row) {
                const macPill = row.querySelector('.mac-pill');
                const locTitle = row.querySelector('.location-title');
                const locSub = row.querySelector('.location-subtext');
                const weightText = row.querySelector('.weight-text-val');
                const timestampText = row.querySelector('.row-timestamp');

                const domData = {
                    id: id,
                    mac: macPill ? macPill.innerText.trim() : 'AA:BB:CC:DD:EE:FF',
                    location: locTitle ? `${locTitle.innerText.trim()} / ${locSub ? locSub.innerText.trim() : ''}` : 'Scale Location',
                    weight: weightText ? parseFloat(weightText.innerText.replace('kg', '')) : 1.50,
                    timestamp: timestampText ? timestampText.innerText.trim() : formatDatetimeLocal()
                };
                openFormModal(true, domData);
            }
        }
    };

    window.triggerDelete = function(id) {
        openConfirmModal(id);
    };

    // Bind Header & Modal Buttons
    const openAddBtn = document.getElementById('open-add-btn');
    if (openAddBtn) openAddBtn.addEventListener('click', () => openFormModal(false));

    const closeModalX = document.getElementById('close-modal-x');
    if (closeModalX) closeModalX.addEventListener('click', closeFormModal);

    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeFormModal);

    // Save Form Handler
    const weightForm = document.getElementById('weight-form');
    if (weightForm) {
        weightForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const recordId = document.getElementById('record-id').value.trim();
            const mac = document.getElementById('mac-address').value.trim();
            const location = document.getElementById('location').value.trim();
            const weight = parseFloat(document.getElementById('weight-value').value) || 0;
            const rawTs = document.getElementById('timestamp').value;

            let formattedTs = rawTs;
            if (rawTs && rawTs.includes('T')) {
                formattedTs = rawTs.replace('T', ' ') + ':00';
            }

            const payload = { id: recordId, mac, location, weight, timestamp: formattedTs };

            try {
                const method = recordId ? 'PUT' : 'POST';
                const res = await fetch('/api/weights', {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    showToast(recordId ? 'Scale record updated!' : 'New scale telemetry logged!', 'success');
                    closeFormModal();
                    await fetchLogs();
                } else {
                    const errData = await res.json();
                    showToast(errData.error || 'Failed to save record.', 'error');
                }
            } catch (err) {
                // Client-side fallback if backend API is offline
                if (recordId) {
                    const idx = currentLogs.findIndex(l => String(l.id) === String(recordId));
                    if (idx !== -1) currentLogs[idx] = payload;
                } else {
                    payload.id = 'loc_' + Date.now();
                    currentLogs.unshift(payload);
                }
                renderTable(currentLogs);
                updateStats(currentLogs);
                closeFormModal();
                showToast('Log saved locally!', 'success');
            }
        });
    }

    // Confirmation Modal Delete Actions
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    if (confirmYesBtn) {
        confirmYesBtn.addEventListener('click', async () => {
            if (!deleteTargetId) return;

            try {
                const res = await fetch(`/api/weights?id=${encodeURIComponent(deleteTargetId)}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    showToast('Record deleted successfully!', 'success');
                    closeConfirmModal();
                    await fetchLogs();
                } else {
                    showToast('Could not delete record.', 'error');
                }
            } catch (err) {
                currentLogs = currentLogs.filter(l => String(l.id) !== String(deleteTargetId));
                renderTable(currentLogs);
                updateStats(currentLogs);
                closeConfirmModal();
                showToast('Record deleted locally!', 'success');
            }
        });
    }

    const confirmNoBtn = document.getElementById('confirm-no-btn');
    if (confirmNoBtn) confirmNoBtn.addEventListener('click', closeConfirmModal);

    // Filters Logic
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            const filterFrom = document.getElementById('filter-from').value;
            const filterTo = document.getElementById('filter-to').value;
            const filterMac = document.getElementById('filter-mac').value.toUpperCase();

            let filtered = currentLogs.filter(log => {
                let pass = true;

                if (filterMac && (log.mac || '').toUpperCase() !== filterMac) {
                    pass = false;
                }

                if (filterFrom && log.timestamp) {
                    if (new Date(log.timestamp) < new Date(filterFrom)) pass = false;
                }

                if (filterTo && log.timestamp) {
                    if (new Date(log.timestamp) > new Date(filterTo)) pass = false;
                }

                return pass;
            });

            renderTable(filtered);
            showToast(`Filter applied: ${filtered.length} record(s) found.`, 'info');
        });
    }

    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            const fromInput = document.getElementById('filter-from');
            const toInput = document.getElementById('filter-to');
            const macSelect = document.getElementById('filter-mac');

            if (fromInput) fromInput.value = '';
            if (toInput) toInput.value = '';
            if (macSelect) macSelect.value = '';

            renderTable(currentLogs);
            showToast('Filters reset to default.', 'info');
        });
    }

    // Simulate Telemetry API Button
    const simulateBtn = document.getElementById('simulate-btn');
    if (simulateBtn) {
        simulateBtn.addEventListener('click', async () => {
            const sampleMacs = ['AA:BB:CC:11:22:33', '12:34:56:78:9A:BC', 'FE:DC:BA:98:76:54'];
            const randomMac = sampleMacs[Math.floor(Math.random() * sampleMacs.length)];
            const randomWeight = parseFloat((Math.random() * 4.5 + 0.8).toFixed(3));
            const nowTs = new Date().toISOString().replace('T', ' ').substring(0, 19);

            const payload = {
                mac: randomMac,
                weight: randomWeight,
                location: 'IoT Telemetry Scale Station 1',
                timestamp: nowTs
            };

            try {
                const res = await fetch('/api/weights', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showToast(`⚡ Telemetry update simulated! Weight: ${randomWeight} kg`, 'success');
                    await fetchLogs();
                }
            } catch (err) {
                payload.id = 'sim_' + Date.now();
                currentLogs.unshift(payload);
                renderTable(currentLogs);
                updateStats(currentLogs);
                showToast(`⚡ Simulated scale update: ${randomWeight} kg`, 'success');
            }
        });
    }

    // Live Scale Polling (/api/live)
    async function pollLiveScale() {
        try {
            const res = await fetch('/api/live');
            if (res.ok) {
                const data = await res.json();
                const liveStatEl = document.getElementById('stat-live-weight');
                if (liveStatEl && data && typeof data.weight === 'number') {
                    liveStatEl.innerHTML = `${parseFloat(data.weight).toFixed(2)} <span class="sub-unit">kg</span>`;
                }
            }
        } catch (e) {}
    }
    setInterval(pollLiveScale, 2000);

    // Initial Load
    fetchLogs();
});
