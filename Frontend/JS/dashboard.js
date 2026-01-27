console.log('[dashboard.js] Script loaded successfully');

// =================================================================
// CONFIGURATION
// =================================================================
const XP_PER_LEVEL = 100;
const DEFAULT_FUTURE_WALLET_RATE = 0.15;

const FUTURE_WALLET_RATE_OPTIONS = [
    { value: 0.05, label: '5%', description: 'Minimal commitment' },
    { value: 0.10, label: '10%', description: 'Steady progress' },
    { value: 0.15, label: '15%', description: 'Recommended' },
    { value: 0.20, label: '20%', description: 'Accelerated savings' },
    { value: 0.25, label: '25%', description: 'Aggressive saver' },
    { value: 0.30, label: '30%', description: 'Maximum commitment' }
];

const LEVEL_DESCRIPTIONS = {
    1: { name: 'Budgeting Basics', desc: 'Learn to allocate your income wisely across needs, wants, and savings.' },
    2: { name: 'Savings Starter', desc: 'Build the habit of setting aside money for emergencies and goals.' },
    3: { name: 'Smart Spender', desc: 'Master the art of distinguishing between needs and wants.' },
    4: { name: 'Investment Intro', desc: 'Understand the basics of growing your money over time.' },
    5: { name: 'Financial Freedom', desc: 'Take control of your complete financial picture.' }
};

const EXPENSE_EVENTS = [
    { id: 'rent', name: 'Rent/Housing', category: 'needs', percentage: 30, icon: '🏠' },
    { id: 'groceries', name: 'Groceries', category: 'needs', percentage: 15, icon: '🛒' },
    { id: 'utilities', name: 'Utilities', category: 'needs', percentage: 5, icon: '💡' },
    { id: 'transport', name: 'Transportation', category: 'needs', percentage: 10, icon: '🚗' },
    { id: 'entertainment', name: 'Entertainment', category: 'wants', percentage: 10, icon: '🎬' },
    { id: 'dining', name: 'Dining Out', category: 'wants', percentage: 8, icon: '🍕' },
    { id: 'shopping', name: 'Shopping', category: 'wants', percentage: 7, icon: '🛍️' }
];

const INVESTMENT_TYPES = {
    fd: { name: 'Fixed Deposit', monthlyReturn: 0.005, risk: 'Low', icon: '🏦', description: 'Stable, predictable returns' },
    balanced: { name: 'Balanced Fund', minReturn: 0.008, maxReturn: 0.012, risk: 'Moderate', icon: '⚖️', description: 'Mix of stability and growth' },
    growth: { name: 'Growth Fund', minReturn: -0.01, maxReturn: 0.02, risk: 'Higher', icon: '📈', description: 'Higher potential, more volatility' }
};

const GOAL_PRESETS = [
    { name: 'Emergency Fund', icon: '🆘', suggestedTarget: 50000, suggestedMonths: 12 },
    { name: 'New Laptop', icon: '💻', suggestedTarget: 80000, suggestedMonths: 6 },
    { name: 'Travel Fund', icon: '✈️', suggestedTarget: 100000, suggestedMonths: 12 },
    { name: 'Higher Education', icon: '🎓', suggestedTarget: 200000, suggestedMonths: 24 },
    { name: 'Startup Capital', icon: '🚀', suggestedTarget: 500000, suggestedMonths: 24 },
    { name: 'Custom Goal', icon: '🎯', suggestedTarget: 0, suggestedMonths: 6 }
];

// =================================================================
// PROFILE & STORAGE
// =================================================================
function getProfile() {
    const data = localStorage.getItem('finplay_profile');
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

function saveProfile(profile) {
    localStorage.setItem('finplay_profile', JSON.stringify(profile));
    if (window.SyncService) {
        window.SyncService.debouncedSave();
    }
}

// =================================================================
// FUTURE SELF WALLET - "Pay Yourself First" System
// =================================================================
function initializeFutureWallet(profile) {
    if (!profile.futureWallet) {
        profile.futureWallet = {
            balance: 0,
            monthlyContribution: 0,
            totalContributed: 0,
            lastContributionMonth: 0,
            rate: DEFAULT_FUTURE_WALLET_RATE,
            rateLocked: false
        };
        saveProfile(profile);
    }
    if (profile.futureWallet.rate === undefined) {
        profile.futureWallet.rate = DEFAULT_FUTURE_WALLET_RATE;
        saveProfile(profile);
    }
    return profile;
}

function getFutureWalletRate(profile) {
    return profile.futureWallet?.rate || DEFAULT_FUTURE_WALLET_RATE;
}

function canChangeRate(profile) {
    return !profile.budget?.allocated;
}

function updateFutureWalletRate(profile, newRate) {
    const validRates = FUTURE_WALLET_RATE_OPTIONS.map(o => o.value);
    if (!validRates.includes(newRate)) {
        return { success: false, error: 'Invalid rate selected' };
    }
    
    if (!canChangeRate(profile)) {
        return { success: false, error: 'Rate locked for this month' };
    }
    
    profile.futureWallet.rate = newRate;
    saveProfile(profile);
    
    return { success: true };
}

function processFutureWalletContribution(profile) {
    const currentMonth = profile.budget?.month || 1;
    const lastContributionMonth = profile.futureWallet?.lastContributionMonth || 0;
    
    if (lastContributionMonth >= currentMonth) {
        return { contributed: false, amount: 0 };
    }
    
    const rate = getFutureWalletRate(profile);
    const contribution = Math.floor(profile.income * rate);
    
    profile.futureWallet.balance += contribution;
    profile.futureWallet.monthlyContribution = contribution;
    profile.futureWallet.totalContributed += contribution;
    profile.futureWallet.lastContributionMonth = currentMonth;
    
    saveProfile(profile);
    
    return { contributed: true, amount: contribution };
}

function getSpendableIncome(profile) {
    const rate = getFutureWalletRate(profile);
    const contribution = Math.floor(profile.income * rate);
    const goalContributions = getTotalGoalContributions(profile);
    return profile.income - contribution - goalContributions;
}

// =================================================================
// GOAL-LOCKED INVESTMENT WALLETS
// =================================================================
function initializeGoalWallets(profile) {
    if (!profile.goalWallets) {
        profile.goalWallets = [];
        saveProfile(profile);
    }
    return profile;
}

function generateWalletId() {
    return 'gw_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function canCreateGoalWallet(profile) {
    return !profile.budget?.allocated;
}

function getTotalGoalContributions(profile) {
    if (!profile.goalWallets) return 0;
    return profile.goalWallets
        .filter(w => w.status === 'active')
        .reduce((sum, w) => sum + w.monthlyContribution, 0);
}

function getAvailableForGoals(profile) {
    const rate = getFutureWalletRate(profile);
    const futureWalletContribution = Math.floor(profile.income * rate);
    const existingGoalContributions = getTotalGoalContributions(profile);
    return profile.income - futureWalletContribution - existingGoalContributions;
}

function createGoalWallet(profile, { name, targetAmount, monthlyContribution, investmentType, lockInMonths }) {
    if (!canCreateGoalWallet(profile)) {
        return { success: false, error: 'Can only create goals before budgeting' };
    }
    
    const available = getAvailableForGoals(profile);
    if (monthlyContribution > available) {
        return { success: false, error: `Monthly contribution exceeds available income (${formatCurrency(available)})` };
    }
    
    if (lockInMonths < 3 || lockInMonths > 24) {
        return { success: false, error: 'Lock-in must be between 3-24 months' };
    }
    
    if (!['fd', 'balanced', 'growth'].includes(investmentType)) {
        return { success: false, error: 'Invalid investment type' };
    }
    
    const currentMonth = profile.budget?.month || 1;
    
    const wallet = {
        id: generateWalletId(),
        name: name,
        targetAmount: targetAmount,
        currentAmount: 0,
        totalContributed: 0,
        totalGrowth: 0,
        monthlyContribution: monthlyContribution,
        investmentType: investmentType,
        lockInMonths: lockInMonths,
        startMonth: currentMonth,
        maturityMonth: currentMonth + lockInMonths,
        status: 'active',
        penaltyApplied: false,
        history: []
    };
    
    profile.goalWallets.push(wallet);
    saveProfile(profile);
    
    return { success: true, wallet };
}

function calculateMonthlyGrowth(wallet) {
    const type = INVESTMENT_TYPES[wallet.investmentType];
    
    if (wallet.investmentType === 'fd') {
        return wallet.currentAmount * type.monthlyReturn;
    }
    
    const range = type.maxReturn - type.minReturn;
    const randomReturn = type.minReturn + (Math.random() * range);
    return wallet.currentAmount * randomReturn;
}

function processGoalWalletMonth(profile) {
    const currentMonth = profile.budget?.month || 1;
    
    profile.goalWallets.forEach(wallet => {
        if (wallet.status !== 'active') return;
        
        const growth = calculateMonthlyGrowth(wallet);
        wallet.currentAmount += wallet.monthlyContribution + growth;
        wallet.totalContributed += wallet.monthlyContribution;
        wallet.totalGrowth += growth;
        
        wallet.history.push({
            month: currentMonth,
            contribution: wallet.monthlyContribution,
            growth: Math.round(growth),
            balance: Math.round(wallet.currentAmount)
        });
        
        if (currentMonth >= wallet.maturityMonth || wallet.currentAmount >= wallet.targetAmount) {
            wallet.status = 'completed';
        }
    });
    
    saveProfile(profile);
}

function withdrawGoalWallet(profile, walletId, earlyWithdrawal = false) {
    const wallet = profile.goalWallets.find(w => w.id === walletId);
    if (!wallet) {
        return { success: false, error: 'Wallet not found' };
    }
    
    if (wallet.status === 'withdrawn_early') {
        return { success: false, error: 'Already withdrawn' };
    }
    
    let withdrawalAmount = wallet.currentAmount;
    let penalty = 0;
    
    if (earlyWithdrawal && wallet.status === 'active') {
        const penaltyRate = 0.15;
        penalty = Math.round(wallet.totalGrowth * penaltyRate);
        withdrawalAmount = wallet.currentAmount - penalty;
        wallet.penaltyApplied = true;
        wallet.status = 'withdrawn_early';
    } else if (wallet.status === 'completed') {
        wallet.status = 'completed';
    }
    
    profile.balance += Math.round(withdrawalAmount);
    wallet.currentAmount = 0;
    wallet.withdrawnAmount = withdrawalAmount;
    wallet.penaltyAmount = penalty;
    
    saveProfile(profile);
    
    return { 
        success: true, 
        amount: Math.round(withdrawalAmount), 
        penalty: penalty,
        wasEarly: earlyWithdrawal && wallet.status === 'withdrawn_early'
    };
}

// =================================================================
// GOAL WALLETS UI
// =================================================================
function showCreateGoalModal(profile) {
    if (!canCreateGoalWallet(profile)) {
        showNotification('Goals can only be created at the start of a month', 'info');
        return;
    }
    
    const available = getAvailableForGoals(profile);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'createGoalModal';
    
    const presetsHtml = GOAL_PRESETS.map((preset, idx) => `
        <button class="goal-preset-btn" data-preset="${idx}">
            <span class="preset-icon">${preset.icon}</span>
            <span class="preset-name">${preset.name}</span>
        </button>
    `).join('');
    
    const investmentOptionsHtml = Object.entries(INVESTMENT_TYPES).map(([key, type]) => `
        <label class="investment-option">
            <input type="radio" name="investmentType" value="${key}" ${key === 'balanced' ? 'checked' : ''}>
            <div class="investment-option-content">
                <span class="investment-icon">${type.icon}</span>
                <div class="investment-info">
                    <span class="investment-name">${type.name}</span>
                    <span class="investment-risk">${type.risk} risk</span>
                </div>
            </div>
        </label>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-content goal-modal">
            <h2>Create Goal Wallet</h2>
            <p class="goal-modal-subtitle">Commit to a future goal. Money here is mentally "spoken for."</p>
            
            <div class="goal-presets">
                ${presetsHtml}
            </div>
            
            <div class="goal-form">
                <div class="form-group">
                    <label>Goal Name</label>
                    <input type="text" id="goalName" placeholder="e.g., Emergency Fund" maxlength="30">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Target Amount</label>
                        <input type="number" id="goalTarget" placeholder="₹" min="1000" step="1000">
                    </div>
                    <div class="form-group">
                        <label>Monthly Contribution</label>
                        <input type="number" id="goalContribution" placeholder="₹" min="100" step="100">
                        <span class="form-hint">Available: ${formatCurrency(available)}</span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Lock-in Period (months)</label>
                    <input type="range" id="goalLockIn" min="3" max="24" value="12">
                    <div class="lockin-display">
                        <span id="lockInValue">12 months</span>
                        <span id="maturityDate"></span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Investment Style</label>
                    <div class="investment-options">
                        ${investmentOptionsHtml}
                    </div>
                </div>
            </div>
            
            <div class="goal-preview">
                <div class="goal-preview-item">
                    <span class="preview-label">Estimated at maturity:</span>
                    <span class="preview-value" id="estimatedMaturity">--</span>
                </div>
            </div>
            
            <div class="goal-info">
                <span class="info-icon">💡</span>
                <span>Naming money changes behavior. Commitment beats motivation.</span>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelGoalBtn">Cancel</button>
                <button class="btn btn-primary" id="createGoalBtn" disabled>Create Goal</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    const goalName = document.getElementById('goalName');
    const goalTarget = document.getElementById('goalTarget');
    const goalContribution = document.getElementById('goalContribution');
    const goalLockIn = document.getElementById('goalLockIn');
    const lockInValue = document.getElementById('lockInValue');
    const createBtn = document.getElementById('createGoalBtn');
    
    function updatePreview() {
        const months = parseInt(goalLockIn.value);
        const contribution = parseInt(goalContribution.value) || 0;
        const investmentType = modal.querySelector('input[name="investmentType"]:checked')?.value || 'balanced';
        
        lockInValue.textContent = `${months} months`;
        
        const type = INVESTMENT_TYPES[investmentType];
        let estimatedGrowth = 0;
        const avgReturn = type.monthlyReturn || ((type.minReturn + type.maxReturn) / 2);
        
        let balance = 0;
        for (let i = 0; i < months; i++) {
            balance += contribution;
            balance += balance * avgReturn;
        }
        
        document.getElementById('estimatedMaturity').textContent = formatCurrency(Math.round(balance));
        
        validateForm();
    }
    
    function validateForm() {
        const name = goalName.value.trim();
        const target = parseInt(goalTarget.value) || 0;
        const contribution = parseInt(goalContribution.value) || 0;
        
        const isValid = name.length >= 2 && 
                       target >= 1000 && 
                       contribution >= 100 && 
                       contribution <= available;
        
        createBtn.disabled = !isValid;
    }
    
    modal.querySelectorAll('.goal-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const presetIdx = parseInt(btn.dataset.preset);
            const preset = GOAL_PRESETS[presetIdx];
            
            if (preset.name !== 'Custom Goal') {
                goalName.value = preset.name;
                goalTarget.value = preset.suggestedTarget;
                goalLockIn.value = preset.suggestedMonths;
            } else {
                goalName.value = '';
                goalTarget.value = '';
            }
            
            modal.querySelectorAll('.goal-preset-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            updatePreview();
        });
    });
    
    goalName.addEventListener('input', validateForm);
    goalTarget.addEventListener('input', updatePreview);
    goalContribution.addEventListener('input', updatePreview);
    goalLockIn.addEventListener('input', updatePreview);
    modal.querySelectorAll('input[name="investmentType"]').forEach(radio => {
        radio.addEventListener('change', updatePreview);
    });
    
    document.getElementById('cancelGoalBtn').addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
    
    document.getElementById('createGoalBtn').addEventListener('click', () => {
        const freshProfile = getProfile();
        
        const result = createGoalWallet(freshProfile, {
            name: goalName.value.trim(),
            targetAmount: parseInt(goalTarget.value),
            monthlyContribution: parseInt(goalContribution.value),
            investmentType: modal.querySelector('input[name="investmentType"]:checked').value,
            lockInMonths: parseInt(goalLockIn.value)
        });
        
        if (result.success) {
            showNotification(`Goal "${goalName.value}" created!`, 'success');
            displayUserData(getProfile());
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        } else {
            showNotification(result.error, 'error');
        }
    });
    
    updatePreview();
}

function showGoalDetailsModal(profile, walletId) {
    const wallet = profile.goalWallets.find(w => w.id === walletId);
    if (!wallet) return;
    
    const currentMonth = profile.budget?.month || 1;
    const monthsRemaining = Math.max(0, wallet.maturityMonth - currentMonth);
    const progress = Math.min(100, (wallet.currentAmount / wallet.targetAmount) * 100);
    const type = INVESTMENT_TYPES[wallet.investmentType];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const isCompleted = wallet.status === 'completed';
    const isWithdrawn = wallet.status === 'withdrawn_early';
    const canWithdraw = !isWithdrawn && wallet.currentAmount > 0;
    
    let actionsHtml = '';
    if (isCompleted && wallet.currentAmount > 0) {
        actionsHtml = `
            <button class="btn btn-primary" id="claimGoalBtn">Claim ${formatCurrency(Math.round(wallet.currentAmount))}</button>
        `;
    } else if (!isCompleted && !isWithdrawn) {
        actionsHtml = `
            <button class="btn btn-secondary" id="earlyWithdrawBtn">Withdraw Early</button>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content goal-details-modal">
            <div class="goal-details-header">
                <h2>${wallet.name}</h2>
                <span class="goal-status-badge status-${wallet.status}">${wallet.status.replace('_', ' ')}</span>
            </div>
            
            <div class="goal-progress-section">
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="goal-progress-labels">
                    <span>${formatCurrency(Math.round(wallet.currentAmount))}</span>
                    <span>${formatCurrency(wallet.targetAmount)}</span>
                </div>
            </div>
            
            <div class="goal-stats-grid">
                <div class="goal-stat">
                    <span class="goal-stat-value">${formatCurrency(wallet.totalContributed)}</span>
                    <span class="goal-stat-label">Total Contributed</span>
                </div>
                <div class="goal-stat">
                    <span class="goal-stat-value">${formatCurrency(Math.round(wallet.totalGrowth))}</span>
                    <span class="goal-stat-label">Investment Growth</span>
                </div>
                <div class="goal-stat">
                    <span class="goal-stat-value">${type.icon} ${type.name}</span>
                    <span class="goal-stat-label">Investment Type</span>
                </div>
                <div class="goal-stat">
                    <span class="goal-stat-value">${monthsRemaining} months</span>
                    <span class="goal-stat-label">Until Maturity</span>
                </div>
            </div>
            
            ${wallet.penaltyApplied ? `
                <div class="goal-penalty-note">
                    <span>Early withdrawal penalty: ${formatCurrency(wallet.penaltyAmount || 0)} (15% of gains)</span>
                </div>
            ` : ''}
            
            <div class="modal-actions">
                <button class="btn btn-secondary" id="closeGoalDetailsBtn">Close</button>
                ${actionsHtml}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    document.getElementById('closeGoalDetailsBtn').addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
    
    const claimBtn = document.getElementById('claimGoalBtn');
    if (claimBtn) {
        claimBtn.addEventListener('click', () => {
            const freshProfile = getProfile();
            const result = withdrawGoalWallet(freshProfile, walletId, false);
            if (result.success) {
                showNotification(`${formatCurrency(result.amount)} added to your balance!`, 'success');
                displayUserData(getProfile());
            }
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
    }
    
    const earlyBtn = document.getElementById('earlyWithdrawBtn');
    if (earlyBtn) {
        earlyBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                showEarlyWithdrawalConfirm(profile, walletId);
            }, 300);
        });
    }
}

function showEarlyWithdrawalConfirm(profile, walletId) {
    const wallet = profile.goalWallets.find(w => w.id === walletId);
    if (!wallet) return;
    
    const penalty = Math.round(wallet.totalGrowth * 0.15);
    const finalAmount = Math.round(wallet.currentAmount - penalty);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content early-withdraw-modal">
            <h2>Withdraw "${wallet.name}" Early?</h2>
            
            <div class="withdraw-warning">
                <p>Withdrawing before maturity means losing some of your investment growth.</p>
                <p class="withdraw-philosophy">This represents lost compounding and the cost of breaking commitment.</p>
            </div>
            
            <div class="withdraw-breakdown">
                <div class="withdraw-line">
                    <span>Current Balance</span>
                    <span>${formatCurrency(Math.round(wallet.currentAmount))}</span>
                </div>
                <div class="withdraw-line penalty">
                    <span>Early Withdrawal Penalty (15% of gains)</span>
                    <span>-${formatCurrency(penalty)}</span>
                </div>
                <div class="withdraw-line final">
                    <span>You'll Receive</span>
                    <span>${formatCurrency(finalAmount)}</span>
                </div>
            </div>
            
            <div class="withdraw-note">
                <span>This goal cannot be resumed after withdrawal.</span>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-primary" id="keepGoalBtn">Keep Growing</button>
                <button class="btn btn-secondary" id="confirmWithdrawBtn">Withdraw Anyway</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    document.getElementById('keepGoalBtn').addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
    
    document.getElementById('confirmWithdrawBtn').addEventListener('click', () => {
        const freshProfile = getProfile();
        const result = withdrawGoalWallet(freshProfile, walletId, true);
        
        if (result.success) {
            showNotification(`${formatCurrency(result.amount)} withdrawn (${formatCurrency(result.penalty)} penalty applied)`, 'info');
            displayUserData(getProfile());
        }
        
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
}

function updateGoalWalletsUI(profile) {
    const container = document.getElementById('goalWalletsContainer');
    if (!container) return;
    
    const canCreate = canCreateGoalWallet(profile);
    const activeWallets = profile.goalWallets?.filter(w => w.status === 'active') || [];
    const completedWallets = profile.goalWallets?.filter(w => w.status === 'completed' && w.currentAmount > 0) || [];
    const allWallets = [...activeWallets, ...completedWallets];
    
    if (allWallets.length === 0) {
        container.innerHTML = `
            <div class="goal-wallets-empty">
                <p>No goal wallets yet</p>
                <p class="empty-subtitle">Lock money toward meaningful future goals</p>
                ${canCreate ? `<button class="btn btn-secondary btn-sm" id="createGoalBtnEmpty">Create Goal Wallet</button>` : ''}
            </div>
        `;
        
        const createBtn = document.getElementById('createGoalBtnEmpty');
        if (createBtn) {
            createBtn.addEventListener('click', () => showCreateGoalModal(profile));
        }
        return;
    }
    
    const currentMonth = profile.budget?.month || 1;
    
    const walletsHtml = allWallets.map(wallet => {
        const progress = Math.min(100, (wallet.currentAmount / wallet.targetAmount) * 100);
        const monthsRemaining = Math.max(0, wallet.maturityMonth - currentMonth);
        const type = INVESTMENT_TYPES[wallet.investmentType];
        
        return `
            <div class="goal-wallet-card" data-wallet-id="${wallet.id}">
                <div class="gwc-header">
                    <span class="gwc-name">${wallet.name}</span>
                    <span class="gwc-badge status-${wallet.status}">${wallet.status === 'completed' ? 'Ready' : `${monthsRemaining}mo left`}</span>
                </div>
                <div class="gwc-progress">
                    <div class="gwc-bar">
                        <div class="gwc-bar-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="gwc-stats">
                    <span>${formatCurrency(Math.round(wallet.currentAmount))} / ${formatCurrency(wallet.targetAmount)}</span>
                    <span class="gwc-type">${type.icon}</span>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="goal-wallets-list">
            ${walletsHtml}
        </div>
        ${canCreate ? `<button class="btn btn-secondary btn-sm" id="createGoalBtnList">+ New Goal</button>` : 
            `<span class="goals-frozen-note">Goals can only be created before budgeting</span>`}
    `;
    
    container.querySelectorAll('.goal-wallet-card').forEach(card => {
        card.addEventListener('click', () => {
            const walletId = card.dataset.walletId;
            showGoalDetailsModal(getProfile(), walletId);
        });
    });
    
    const createBtn = document.getElementById('createGoalBtnList');
    if (createBtn) {
        createBtn.addEventListener('click', () => showCreateGoalModal(profile));
    }
}

// =================================================================
// RATE ADJUSTMENT UI
// =================================================================
function showRateAdjustmentModal(profile) {
    if (!canChangeRate(profile)) {
        showNotification('Rate is locked once budgeting begins', 'info');
        return;
    }
    
    const currentRate = getFutureWalletRate(profile);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'rateAdjustModal';
    
    const optionsHtml = FUTURE_WALLET_RATE_OPTIONS.map(opt => `
        <label class="rate-option ${opt.value === currentRate ? 'selected' : ''}">
            <input type="radio" name="walletRate" value="${opt.value}" ${opt.value === currentRate ? 'checked' : ''}>
            <div class="rate-option-content">
                <span class="rate-value">${opt.label}</span>
                <span class="rate-desc">${opt.description}</span>
            </div>
        </label>
    `).join('');
    
    const previewAmount = Math.floor(profile.income * currentRate);
    
    modal.innerHTML = `
        <div class="modal-content rate-modal">
            <h2>Adjust Savings Rate</h2>
            <p class="rate-modal-subtitle">Choose how much to protect for your future each month</p>
            
            <div class="rate-options">
                ${optionsHtml}
            </div>
            
            <div class="rate-preview">
                <div class="rate-preview-label">Next month's protection:</div>
                <div class="rate-preview-amount" id="ratePreviewAmount">${formatCurrency(previewAmount)}</div>
                <div class="rate-preview-note">of ${formatCurrency(profile.income)} income</div>
            </div>
            
            <p class="rate-info-text">
                This rate applies starting this month. Consistency matters more than intensity.
            </p>
            
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelRateBtn">Cancel</button>
                <button class="btn btn-primary" id="confirmRateBtn">Confirm Rate</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    modal.querySelectorAll('input[name="walletRate"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newRate = parseFloat(e.target.value);
            const newAmount = Math.floor(profile.income * newRate);
            document.getElementById('ratePreviewAmount').textContent = formatCurrency(newAmount);
            
            modal.querySelectorAll('.rate-option').forEach(opt => opt.classList.remove('selected'));
            e.target.closest('.rate-option').classList.add('selected');
        });
    });
    
    document.getElementById('cancelRateBtn').addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
    
    document.getElementById('confirmRateBtn').addEventListener('click', () => {
        const selectedRate = parseFloat(modal.querySelector('input[name="walletRate"]:checked').value);
        const result = updateFutureWalletRate(getProfile(), selectedRate);
        
        if (result.success) {
            const rateLabel = FUTURE_WALLET_RATE_OPTIONS.find(o => o.value === selectedRate)?.label || '15%';
            showNotification(`Savings rate set to ${rateLabel}`, 'success');
            
            const freshProfile = getProfile();
            if (freshProfile.futureWallet.lastContributionMonth < freshProfile.budget.month) {
                processFutureWalletContribution(freshProfile);
            }
            
            displayUserData(getProfile());
        } else {
            showNotification(result.error, 'error');
        }
        
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
}

// =================================================================
// BUDGET STATE INITIALIZATION
// =================================================================
function initializeBudgetState(profile) {
    if (!profile.budget) {
        profile.budget = {
            month: 1,
            allocated: false,
            needs: 0,
            wants: 0,
            savings: 0,
            needsRemaining: 0,
            wantsRemaining: 0,
            savingsRemaining: 0,
            expensesPaid: [],
            monthHistory: []
        };
        saveProfile(profile);
    }
    return profile;
}

// =================================================================
// XP & LEVEL SYSTEM
// =================================================================
function calculateLevel(xp) {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function getXpForCurrentLevel(xp) {
    return xp % XP_PER_LEVEL;
}

function getLevelInfo(level) {
    return LEVEL_DESCRIPTIONS[level] || LEVEL_DESCRIPTIONS[5];
}

function addXp(amount, silent = false) {
    const profile = getProfile();
    if (!profile) return null;
    
    const oldLevel = profile.level;
    profile.xp = Math.max(0, profile.xp + amount);
    profile.level = calculateLevel(profile.xp);
    
    saveProfile(profile);
    
    if (!silent) {
        if (profile.level > oldLevel) {
            showNotification(`Level Up! You're now Level ${profile.level}!`, 'success');
        } else if (amount > 0) {
            showNotification(`+${amount} XP earned!`, 'xp');
        } else if (amount < 0) {
            showNotification(`${amount} XP penalty!`, 'error');
        }
    }
    
    return profile;
}

// =================================================================
// UI HELPERS
// =================================================================
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.game-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `game-notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

function formatCurrency(amount) {
    return `₹${amount.toLocaleString('en-IN')}`;
}

// =================================================================
// DISPLAY FUNCTIONS
// =================================================================
function displayUserData(profile) {
    document.getElementById('userName').textContent = profile.name;
    document.getElementById('virtualBalance').textContent = formatCurrency(profile.balance);
    document.getElementById('monthlyIncome').textContent = formatCurrency(profile.income);
    document.getElementById('xpValue').textContent = `${profile.xp} XP`;
    document.getElementById('focusGoal').textContent = profile.focus_goal;
    document.getElementById('knowledgeLevel').textContent = profile.knowledge_level;
    document.getElementById('lifeStage').textContent = profile.life_stage;
    document.getElementById('primaryGoal').textContent = profile.focus_goal;
    document.getElementById('currentLevel').textContent = `Level ${profile.level}`;
    
    const xpInLevel = getXpForCurrentLevel(profile.xp);
    const xpProgress = (xpInLevel / XP_PER_LEVEL) * 100;
    
    document.getElementById('currentXp').textContent = `${xpInLevel} XP`;
    document.getElementById('xpFill').style.width = `${xpProgress}%`;
    document.getElementById('xpToNext').textContent = `${XP_PER_LEVEL} XP to Level ${profile.level + 1}`;
    
    const levelInfo = getLevelInfo(profile.level);
    document.getElementById('levelName').textContent = `Level ${profile.level} – ${levelInfo.name}`;
    document.getElementById('levelDescription').textContent = levelInfo.desc;
    
    document.getElementById('levelBadge').querySelector('span:last-child').textContent = `Level ${profile.level}`;

    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';
    
    updateFutureWalletUI(profile);
    updateGoalWalletsUI(profile);
    updateBudgetUI(profile);
}

function updateFutureWalletUI(profile) {
    const walletCard = document.getElementById('futureWalletCard');
    if (!walletCard || !profile.futureWallet) return;
    
    document.getElementById('futureWalletBalance').textContent = formatCurrency(profile.futureWallet.balance);
    document.getElementById('futureWalletContribution').textContent = formatCurrency(profile.futureWallet.monthlyContribution);
    document.getElementById('futureWalletTotal').textContent = formatCurrency(profile.futureWallet.totalContributed);
    
    const ratePercent = Math.round(getFutureWalletRate(profile) * 100);
    const rateDisplay = document.getElementById('currentRateDisplay');
    if (rateDisplay) {
        rateDisplay.textContent = `${ratePercent}%`;
    }
    
    const subtitle = walletCard.querySelector('.fw-subtitle');
    if (subtitle) {
        subtitle.textContent = `Pay Yourself First — ${ratePercent}% auto-saved before spending`;
    }
    
    const adjustBtn = document.getElementById('adjustRateBtn');
    if (adjustBtn) {
        const canChange = canChangeRate(profile);
        adjustBtn.style.display = canChange ? 'inline-flex' : 'none';
        
        const lockedIndicator = document.getElementById('rateLocked');
        if (lockedIndicator) {
            lockedIndicator.style.display = canChange ? 'none' : 'inline-flex';
        }
    }
}

function updateBudgetUI(profile) {
    const budget = profile.budget;
    const spendableIncome = getSpendableIncome(profile);
    
    document.getElementById('currentMonth').textContent = `Month ${budget.month}`;
    
    const spendableEl = document.getElementById('spendableIncome');
    if (spendableEl) {
        spendableEl.textContent = formatCurrency(spendableIncome);
    }
    
    if (budget.allocated) {
        document.getElementById('budgetAllocation').style.display = 'none';
        document.getElementById('budgetOverview').style.display = 'block';
        document.getElementById('expenseSection').style.display = 'block';
        
        document.getElementById('needsAllocated').textContent = formatCurrency(budget.needs);
        document.getElementById('needsRemaining').textContent = formatCurrency(budget.needsRemaining);
        document.getElementById('needsBar').style.width = `${(budget.needsRemaining / budget.needs) * 100}%`;
        
        document.getElementById('wantsAllocated').textContent = formatCurrency(budget.wants);
        document.getElementById('wantsRemaining').textContent = formatCurrency(budget.wantsRemaining);
        document.getElementById('wantsBar').style.width = `${(budget.wantsRemaining / budget.wants) * 100}%`;
        
        document.getElementById('savingsAllocated').textContent = formatCurrency(budget.savings);
        document.getElementById('savingsRemaining').textContent = formatCurrency(budget.savingsRemaining);
        document.getElementById('savingsBar').style.width = '100%';
        
        renderExpenseEvents(profile);
        updateMonthEndButton(profile);
    } else {
        document.getElementById('budgetAllocation').style.display = 'block';
        document.getElementById('budgetOverview').style.display = 'none';
        document.getElementById('expenseSection').style.display = 'none';
        
        document.getElementById('needsInput').value = '';
        document.getElementById('wantsInput').value = '';
        document.getElementById('savingsInput').value = '';
        updateAllocationPreview();
    }
}

function updateAllocationPreview() {
    const profile = getProfile();
    if (!profile) return;
    
    const spendableIncome = getSpendableIncome(profile);
    const needs = parseInt(document.getElementById('needsInput').value) || 0;
    const wants = parseInt(document.getElementById('wantsInput').value) || 0;
    const savings = parseInt(document.getElementById('savingsInput').value) || 0;
    
    const total = needs + wants + savings;
    const remaining = spendableIncome - total;
    
    document.getElementById('allocationTotal').textContent = formatCurrency(total);
    document.getElementById('allocationRemaining').textContent = formatCurrency(remaining);
    
    const allocateBtn = document.getElementById('allocateBudgetBtn');
    if (total === spendableIncome && needs > 0 && wants >= 0 && savings >= 0) {
        allocateBtn.disabled = false;
        document.getElementById('allocationRemaining').style.color = 'var(--success)';
    } else {
        allocateBtn.disabled = true;
        document.getElementById('allocationRemaining').style.color = remaining < 0 ? 'var(--error)' : 'var(--text-secondary)';
    }
}

// =================================================================
// BUDGET ALLOCATION
// =================================================================
function allocateBudget() {
    const profile = getProfile();
    if (!profile) return;
    
    const spendableIncome = getSpendableIncome(profile);
    const needs = parseInt(document.getElementById('needsInput').value) || 0;
    const wants = parseInt(document.getElementById('wantsInput').value) || 0;
    const savings = parseInt(document.getElementById('savingsInput').value) || 0;
    
    if (needs + wants + savings !== spendableIncome) {
        showNotification('Allocation must equal your spendable income!', 'error');
        return;
    }
    
    profile.budget.allocated = true;
    profile.budget.needs = needs;
    profile.budget.wants = wants;
    profile.budget.savings = savings;
    profile.budget.needsRemaining = needs;
    profile.budget.wantsRemaining = wants;
    profile.budget.savingsRemaining = savings + (profile.budget.savingsRemaining || 0);
    profile.budget.expensesPaid = [];
    
    saveProfile(profile);
    
    const savingsPercent = (savings / spendableIncome) * 100;
    if (savingsPercent >= 20) {
        addXp(25);
        showNotification('Great savings allocation! +25 XP', 'success');
    } else if (savingsPercent >= 10) {
        addXp(15);
    } else {
        addXp(10);
    }
    
    displayUserData(getProfile());
}

// =================================================================
// EXPENSE HANDLING
// =================================================================
function renderExpenseEvents(profile) {
    const container = document.getElementById('expenseList');
    container.innerHTML = '';
    
    const spendableIncome = getSpendableIncome(profile);
    
    EXPENSE_EVENTS.forEach(expense => {
        const amount = Math.floor(spendableIncome * (expense.percentage / 100));
        const isPaid = profile.budget.expensesPaid.includes(expense.id);
        const canAfford = expense.category === 'needs' 
            ? profile.budget.needsRemaining >= amount 
            : profile.budget.wantsRemaining >= amount;
        
        const card = document.createElement('div');
        card.className = `expense-card ${isPaid ? 'paid' : ''} ${!canAfford && !isPaid ? 'insufficient' : ''}`;
        card.innerHTML = `
            <div class="expense-icon">${expense.icon}</div>
            <div class="expense-info">
                <div class="expense-name">${expense.name}</div>
                <div class="expense-category">${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}</div>
            </div>
            <div class="expense-amount">${formatCurrency(amount)}</div>
            <button class="btn btn-secondary expense-btn" ${isPaid || !canAfford ? 'disabled' : ''} data-expense-id="${expense.id}">
                ${isPaid ? 'Paid' : canAfford ? 'Pay' : 'Insufficient'}
            </button>
        `;
        
        if (!isPaid && canAfford) {
            card.querySelector('.expense-btn').addEventListener('click', () => payExpense(expense.id));
        }
        
        container.appendChild(card);
    });
}

function payExpense(expenseId) {
    const profile = getProfile();
    if (!profile) return;
    
    const expense = EXPENSE_EVENTS.find(e => e.id === expenseId);
    if (!expense) return;
    
    const spendableIncome = getSpendableIncome(profile);
    const amount = Math.floor(spendableIncome * (expense.percentage / 100));
    
    if (expense.category === 'needs') {
        if (profile.budget.needsRemaining < amount) {
            showNotification('Insufficient funds in Needs budget!', 'error');
            return;
        }
        profile.budget.needsRemaining -= amount;
    } else {
        if (profile.budget.wantsRemaining < amount) {
            showNotification('Insufficient funds in Wants budget!', 'error');
            return;
        }
        profile.budget.wantsRemaining -= amount;
    }
    
    profile.budget.expensesPaid.push(expenseId);
    saveProfile(profile);
    
    addXp(5, true);
    showNotification(`Paid ${expense.name}: ${formatCurrency(amount)}`, 'info');
    
    displayUserData(getProfile());
}

function updateMonthEndButton(profile) {
    const needsExpenses = EXPENSE_EVENTS.filter(e => e.category === 'needs');
    const allNeedsPaid = needsExpenses.every(e => profile.budget.expensesPaid.includes(e.id));
    
    const endMonthBtn = document.getElementById('endMonthBtn');
    endMonthBtn.disabled = !allNeedsPaid;
    
    if (!allNeedsPaid) {
        endMonthBtn.title = 'Pay all essential expenses (Needs) first!';
    } else {
        endMonthBtn.title = '';
    }
}

// =================================================================
// END MONTH
// =================================================================
function endMonth() {
    const profile = getProfile();
    if (!profile) return;
    
    const needsExpenses = EXPENSE_EVENTS.filter(e => e.category === 'needs');
    const allNeedsPaid = needsExpenses.every(e => profile.budget.expensesPaid.includes(e.id));
    
    if (!allNeedsPaid) {
        showNotification('Pay all essential expenses first!', 'error');
        return;
    }
    
    let xpBonus = 0;
    let summary = [];
    
    const futureWalletContribution = profile.futureWallet?.monthlyContribution || 0;
    const currentRate = getFutureWalletRate(profile);
    
    if (profile.budget.needsRemaining > 0) {
        profile.budget.savingsRemaining += profile.budget.needsRemaining;
        summary.push(`Needs surplus: ${formatCurrency(profile.budget.needsRemaining)} → Savings`);
        xpBonus += 10;
    }
    
    if (profile.budget.wantsRemaining > 0) {
        profile.budget.savingsRemaining += profile.budget.wantsRemaining;
        summary.push(`Wants surplus: ${formatCurrency(profile.budget.wantsRemaining)} → Savings`);
        xpBonus += 15;
    }
    
    const spendableIncome = getSpendableIncome(profile);
    const savingsRate = (profile.budget.savingsRemaining / spendableIncome) * 100;
    if (savingsRate >= 30) {
        xpBonus += 20;
        summary.push('Excellent savings rate bonus!');
    } else if (savingsRate >= 20) {
        xpBonus += 10;
        summary.push('Good savings rate bonus!');
    }
    
    profile.budget.monthHistory.push({
        month: profile.budget.month,
        needs: profile.budget.needs,
        wants: profile.budget.wants,
        savings: profile.budget.savings,
        totalSaved: profile.budget.savingsRemaining,
        futureWalletContribution: futureWalletContribution,
        futureWalletRate: currentRate,
        xpEarned: xpBonus
    });
    
    profile.balance += profile.budget.savingsRemaining;
    
    processGoalWalletMonth(profile);
    
    profile.budget.month += 1;
    profile.budget.allocated = false;
    profile.budget.needs = 0;
    profile.budget.wants = 0;
    profile.budget.savings = 0;
    profile.budget.needsRemaining = 0;
    profile.budget.wantsRemaining = 0;
    profile.budget.expensesPaid = [];
    
    saveProfile(profile);
    
    if (xpBonus > 0) {
        addXp(xpBonus);
    }
    
    showMonthSummary(
        profile.budget.month - 1, 
        summary, 
        xpBonus, 
        profile.budget.savingsRemaining,
        futureWalletContribution,
        currentRate
    );
    
    const freshProfile = getProfile();
    const walletResult = processFutureWalletContribution(freshProfile);
    if (walletResult.contributed) {
        setTimeout(() => {
            showNotification(`${formatCurrency(walletResult.amount)} protected for your future!`, 'xp');
        }, 500);
    }
    
    displayUserData(getProfile());
}

function showMonthSummary(month, summary, xpEarned, totalSaved, futureWalletContribution, rate) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const ratePercent = Math.round(rate * 100);
    
    const futureWalletMessage = futureWalletContribution > 0 
        ? `<div class="future-wallet-summary">
             <div class="fw-icon">🔐</div>
             <div class="fw-text">
               <strong>${formatCurrency(futureWalletContribution)}</strong> (${ratePercent}%) was automatically protected for your future before you spent anything.
             </div>
           </div>`
        : '';
    
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Month ${month} Complete!</h2>
            ${futureWalletMessage}
            <div class="summary-stats">
                <div class="summary-stat">
                    <span class="summary-stat-value">${formatCurrency(totalSaved)}</span>
                    <span class="summary-stat-label">Added to Balance</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-stat-value">+${xpEarned} XP</span>
                    <span class="summary-stat-label">Earned</span>
                </div>
            </div>
            ${summary.length > 0 ? `<ul class="summary-list">${summary.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
            <button class="btn btn-primary" id="closeModalBtn">Start Month ${month + 1}</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
}

// =================================================================
// PAGE INITIALIZATION
// =================================================================
async function loadUserData() {
    if (window.SyncService) {
        await window.SyncService.initializeFromServer();
    }
    
    let profile = getProfile();
    
    if (!profile) {
        window.location.href = '/';
        return;
    }

    if (!profile.level) {
        profile.level = calculateLevel(profile.xp);
        saveProfile(profile);
    }
    
    profile = initializeBudgetState(profile);
    profile = initializeFutureWallet(profile);
    profile = initializeGoalWallets(profile);
    
    const walletResult = processFutureWalletContribution(profile);
    if (walletResult.contributed) {
        setTimeout(() => {
            showNotification(`${formatCurrency(walletResult.amount)} protected for your future!`, 'xp');
        }, 1000);
    }
    
    displayUserData(getProfile());
}

document.addEventListener('DOMContentLoaded', () => {
    loadUserData();

    document.getElementById('startLevelBtn').addEventListener('click', () => {
        const profile = getProfile();
        if (profile) {
            addXp(5);
            displayUserData(getProfile());
        }
    });

    document.getElementById('needsInput').addEventListener('input', updateAllocationPreview);
    document.getElementById('wantsInput').addEventListener('input', updateAllocationPreview);
    document.getElementById('savingsInput').addEventListener('input', updateAllocationPreview);
    document.getElementById('allocateBudgetBtn').addEventListener('click', allocateBudget);
    document.getElementById('endMonthBtn').addEventListener('click', endMonth);
    
    const adjustRateBtn = document.getElementById('adjustRateBtn');
    if (adjustRateBtn) {
        adjustRateBtn.addEventListener('click', () => {
            const profile = getProfile();
            if (profile) showRateAdjustmentModal(profile);
        });
    }
});
