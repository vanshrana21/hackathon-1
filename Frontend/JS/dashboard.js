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
            
            const triggerData = checkEarlyWithdrawalReflection(getProfile(), wallet.name);
            if (triggerData) {
                const reflection = createReflectionLog(getProfile(), triggerData);
                setTimeout(() => {
                    showReflectionModal(getProfile(), reflection);
                }, 1000);
            }
            
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
                <p class="empty-subtitle">When you're ready, create a goal to commit money toward something meaningful</p>
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
    
    const activeGoals = (profile.goalWallets || []).filter(w => w.status === 'active').length;
    document.getElementById('focusGoal').textContent = activeGoals > 0 ? activeGoals : '-';
    
    const futureWalletBalance = profile.futureWallet?.balance || 0;
    const goalWalletTotal = (profile.goalWallets || [])
        .filter(w => w.status === 'active')
        .reduce((sum, w) => sum + (w.currentAmount || 0), 0);
    const totalProtectedEl = document.getElementById('totalProtected');
    if (totalProtectedEl) {
        totalProtectedEl.textContent = formatCurrency(futureWalletBalance + goalWalletTotal);
    }
    
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
    
    const ratePercent = Math.round(getFutureWalletRate(profile) * 100);
    
    document.getElementById('futureWalletBalance').textContent = formatCurrency(profile.futureWallet.balance);
    document.getElementById('futureWalletContribution').textContent = formatCurrency(profile.futureWallet.monthlyContribution);
    
    const rateEl = document.getElementById('futureWalletRate');
    if (rateEl) {
        rateEl.textContent = `${ratePercent}%`;
    }
    
    const rateDisplay = document.getElementById('currentRateDisplay');
    if (rateDisplay) {
        rateDisplay.textContent = `${ratePercent}%`;
    }
    
    const subtitle = walletCard.querySelector('.fw-subtitle');
    if (subtitle) {
        subtitle.textContent = `Automatically saves ${ratePercent}% of your income before you can spend it`;
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
// LIFE SHOCK SCENARIOS
// =================================================================
const LIFE_EVENTS = {
    negative: [
        {
            id: 'medical_expense',
            category: 'health',
            title: 'Unexpected Medical Expense',
            description: 'A sudden health issue required immediate attention and treatment.',
            impact: { cashChange: -15000 },
            takeaway: 'This is why emergency funds exist — not to avoid emergencies, but to survive them calmly.',
            probability: 0.15
        },
        {
            id: 'car_repair',
            category: 'expense',
            title: 'Vehicle Breakdown',
            description: 'Your vehicle needed urgent repairs to stay functional.',
            impact: { cashChange: -8000 },
            takeaway: 'Unexpected repairs are part of life. A buffer makes them manageable, not catastrophic.',
            probability: 0.12
        },
        {
            id: 'pay_delay',
            category: 'income',
            title: 'Salary Delay',
            description: 'Your employer delayed this month\'s payment due to cash flow issues.',
            impact: { incomeChange: -0.3 },
            takeaway: 'Income isn\'t always predictable. Savings provide stability when paychecks don\'t.',
            probability: 0.08
        },
        {
            id: 'market_dip',
            category: 'market',
            title: 'Market Correction',
            description: 'Financial markets experienced a temporary downturn this month.',
            impact: { marketEffect: -0.08 },
            takeaway: 'Market volatility is normal. Long-term investors benefit from staying the course.',
            probability: 0.10
        },
        {
            id: 'home_repair',
            category: 'expense',
            title: 'Home Repair Needed',
            description: 'A plumbing issue required immediate professional attention.',
            impact: { cashChange: -5000 },
            takeaway: 'Homes need maintenance. Budgeting for the unexpected prevents stress.',
            probability: 0.10
        }
    ],
    positive: [
        {
            id: 'bonus',
            category: 'income',
            title: 'Performance Bonus',
            description: 'Your hard work was recognized with a one-time bonus.',
            impact: { cashChange: 10000 },
            takeaway: 'Windfalls are opportunities. How you use them shapes your financial future.',
            probability: 0.10
        },
        {
            id: 'tax_refund',
            category: 'income',
            title: 'Tax Refund',
            description: 'You received a refund from your tax filing.',
            impact: { cashChange: 8000 },
            takeaway: 'Unexpected income is a chance to strengthen your financial foundation.',
            probability: 0.08
        },
        {
            id: 'side_income',
            category: 'income',
            title: 'Side Income Opportunity',
            description: 'A freelance project brought in extra income this month.',
            impact: { cashChange: 6000 },
            takeaway: 'Multiple income streams build resilience and flexibility.',
            probability: 0.07
        },
        {
            id: 'gift',
            category: 'income',
            title: 'Financial Gift',
            description: 'A family member gave you a monetary gift.',
            impact: { cashChange: 5000 },
            takeaway: 'Gifts can accelerate goals when applied thoughtfully.',
            probability: 0.05
        }
    ],
    neutral: [
        {
            id: 'job_offer',
            category: 'opportunity',
            title: 'New Job Opportunity',
            description: 'You received an offer for a new position with different terms.',
            hasDecision: true,
            choices: [
                { 
                    id: 'accept', 
                    label: 'Accept the offer', 
                    impact: { incomeChange: 0.15 },
                    outcome: 'You took a chance on growth. New challenges often bring new rewards.'
                },
                { 
                    id: 'decline', 
                    label: 'Stay in current role', 
                    impact: { cashChange: 0 },
                    outcome: 'Stability has its own value. You chose what felt right for now.'
                }
            ],
            takeaway: 'Career decisions have no universally right answer — only what\'s right for you.',
            probability: 0.06
        },
        {
            id: 'investment_opportunity',
            category: 'opportunity',
            title: 'Investment Opportunity',
            description: 'A friend suggested an investment opportunity with uncertain returns.',
            hasDecision: true,
            choices: [
                { 
                    id: 'invest', 
                    label: 'Invest a portion', 
                    impact: { cashChange: -5000 },
                    outcome: 'You took a calculated risk. Time will tell how it plays out.'
                },
                { 
                    id: 'pass', 
                    label: 'Pass on this one', 
                    impact: { cashChange: 0 },
                    outcome: 'Not every opportunity needs to be taken. Selectivity is a skill.'
                }
            ],
            takeaway: 'Opportunities feel urgent but rarely are. Taking time to decide is wisdom, not hesitation.',
            probability: 0.05
        }
    ]
};

function initializeLifeEvents(profile) {
    if (!profile.lifeEvents) {
        profile.lifeEvents = [];
        saveProfile(profile);
    }
    return profile;
}

function generateLifeEventId() {
    return 'le_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getLastEventMonth(profile) {
    if (!profile.lifeEvents || profile.lifeEvents.length === 0) return 0;
    return Math.max(...profile.lifeEvents.map(e => e.month));
}

function calculateStabilityFactor(profile) {
    let factor = 1.0;
    
    const hasEmergencyFund = profile.balance > profile.income * 3;
    if (hasEmergencyFund) factor *= 0.7;
    
    const hasDiversifiedGoals = (profile.goalWallets?.filter(w => w.status === 'active').length || 0) >= 2;
    if (hasDiversifiedGoals) factor *= 0.8;
    
    const hasConsistentSavings = (profile.budget?.monthHistory?.length || 0) >= 3;
    if (hasConsistentSavings) {
        const recentMonths = profile.budget.monthHistory.slice(-3);
        const avgSavings = recentMonths.reduce((sum, m) => sum + m.totalSaved, 0) / 3;
        if (avgSavings > profile.income * 0.1) factor *= 0.85;
    }
    
    return Math.max(0.4, factor);
}

function shouldTriggerLifeEvent(profile) {
    const currentMonth = profile.budget?.month || 1;
    const lastEventMonth = getLastEventMonth(profile);
    
    if (currentMonth - lastEventMonth < 2) return false;
    
    if (currentMonth <= 2) return false;
    
    const stabilityFactor = calculateStabilityFactor(profile);
    const baseChance = 0.35;
    const adjustedChance = baseChance * stabilityFactor;
    
    return Math.random() < adjustedChance;
}

function selectLifeEvent(profile) {
    const stabilityFactor = calculateStabilityFactor(profile);
    
    let negativeWeight = 0.45 * stabilityFactor;
    let positiveWeight = 0.35 + (1 - stabilityFactor) * 0.1;
    let neutralWeight = 0.20;
    
    const totalWeight = negativeWeight + positiveWeight + neutralWeight;
    negativeWeight /= totalWeight;
    positiveWeight /= totalWeight;
    
    const roll = Math.random();
    let eventType;
    
    if (roll < negativeWeight) {
        eventType = 'negative';
    } else if (roll < negativeWeight + positiveWeight) {
        eventType = 'positive';
    } else {
        eventType = 'neutral';
    }
    
    const events = LIFE_EVENTS[eventType];
    const totalProbability = events.reduce((sum, e) => sum + e.probability, 0);
    let randomPick = Math.random() * totalProbability;
    
    for (const event of events) {
        randomPick -= event.probability;
        if (randomPick <= 0) {
            return { ...event, type: eventType };
        }
    }
    
    return { ...events[0], type: eventType };
}

function applyLifeEventImpact(profile, event, choiceId = null) {
    let impact = event.impact;
    
    if (event.hasDecision && choiceId) {
        const choice = event.choices.find(c => c.id === choiceId);
        if (choice) {
            impact = choice.impact;
        }
    }
    
    if (impact.cashChange) {
        profile.balance = Math.max(0, profile.balance + impact.cashChange);
    }
    
    if (impact.marketEffect && profile.goalWallets) {
        profile.goalWallets.forEach(wallet => {
            if (wallet.status === 'active' && wallet.investmentType !== 'fd') {
                const change = wallet.currentAmount * impact.marketEffect;
                wallet.currentAmount = Math.max(0, wallet.currentAmount + change);
                wallet.totalGrowth += change;
            }
        });
    }
    
    saveProfile(profile);
    return impact;
}

function createLifeEventLog(profile, eventData, choiceId = null) {
    const currentMonth = profile.budget?.month || 1;
    
    let outcome = eventData.takeaway;
    if (eventData.hasDecision && choiceId) {
        const choice = eventData.choices.find(c => c.id === choiceId);
        if (choice) {
            outcome = choice.outcome;
        }
    }
    
    const logEntry = {
        id: generateLifeEventId(),
        month: currentMonth,
        type: eventData.type,
        category: eventData.category,
        title: eventData.title,
        description: eventData.description,
        financialImpact: eventData.hasDecision && choiceId 
            ? eventData.choices.find(c => c.id === choiceId)?.impact 
            : eventData.impact,
        userDecision: choiceId || null,
        takeaway: outcome,
        resolved: true
    };
    
    profile.lifeEvents.push(logEntry);
    saveProfile(profile);
    
    return logEntry;
}

function showLifeEventModal(profile, eventData) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay life-event-overlay';
    
    const typeClass = eventData.type;
    const typeIcon = eventData.type === 'negative' ? '⚠️' : eventData.type === 'positive' ? '✨' : '🔄';
    
    let impactHtml = '';
    if (!eventData.hasDecision) {
        const impact = eventData.impact;
        if (impact.cashChange) {
            const sign = impact.cashChange > 0 ? '+' : '';
            const colorClass = impact.cashChange > 0 ? 'positive' : 'negative';
            impactHtml = `<div class="le-impact ${colorClass}">${sign}${formatCurrency(impact.cashChange)}</div>`;
        } else if (impact.incomeChange) {
            const percent = Math.round(impact.incomeChange * 100);
            const sign = percent > 0 ? '+' : '';
            impactHtml = `<div class="le-impact ${percent > 0 ? 'positive' : 'negative'}">${sign}${percent}% income this month</div>`;
        } else if (impact.marketEffect) {
            const percent = Math.round(impact.marketEffect * 100);
            impactHtml = `<div class="le-impact negative">${percent}% on growth investments</div>`;
        }
    }
    
    let choicesHtml = '';
    if (eventData.hasDecision) {
        choicesHtml = `
            <div class="le-choices">
                <p class="le-choices-prompt">What would you like to do?</p>
                ${eventData.choices.map(choice => `
                    <button class="le-choice-btn" data-choice="${choice.id}">
                        <span class="choice-label">${choice.label}</span>
                        <span class="choice-impact">${formatChoiceImpact(choice.impact)}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content life-event-modal le-${typeClass}">
            <div class="le-header">
                <span class="le-type-icon">${typeIcon}</span>
                <span class="le-category">${eventData.category}</span>
            </div>
            
            <h2 class="le-title">${eventData.title}</h2>
            
            <p class="le-description">${eventData.description}</p>
            
            ${impactHtml}
            
            ${choicesHtml}
            
            <div class="le-takeaway">
                <span class="takeaway-icon">💡</span>
                <p>${eventData.takeaway}</p>
            </div>
            
            ${!eventData.hasDecision ? `
                <button class="btn btn-primary le-continue-btn" id="acknowledgeEventBtn">Continue</button>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    if (!eventData.hasDecision) {
        document.getElementById('acknowledgeEventBtn').addEventListener('click', () => {
            applyLifeEventImpact(profile, eventData);
            createLifeEventLog(profile, eventData);
            
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                displayUserData(getProfile());
            }, 300);
        });
    } else {
        modal.querySelectorAll('.le-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const choiceId = btn.dataset.choice;
                const freshProfile = getProfile();
                
                applyLifeEventImpact(freshProfile, eventData, choiceId);
                createLifeEventLog(freshProfile, eventData, choiceId);
                
                const choice = eventData.choices.find(c => c.id === choiceId);
                showNotification(choice.outcome, 'info');
                
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                    displayUserData(getProfile());
                }, 300);
            });
        });
    }
}

function formatChoiceImpact(impact) {
    if (impact.cashChange) {
        const sign = impact.cashChange > 0 ? '+' : '';
        return `${sign}${formatCurrency(impact.cashChange)}`;
    }
    if (impact.incomeChange) {
        const percent = Math.round(impact.incomeChange * 100);
        return `${percent > 0 ? '+' : ''}${percent}% income`;
    }
    return 'No immediate impact';
}

function checkAndTriggerLifeEvent(profile) {
    if (!shouldTriggerLifeEvent(profile)) return false;
    
    const event = selectLifeEvent(profile);
    
    setTimeout(() => {
        showLifeEventModal(getProfile(), event);
    }, 1000);
    
    return true;
}

// =================================================================
// REGRET-FREE REVIEW SYSTEM
// =================================================================
const AUTO_INSIGHTS = {
    budget: [
        "One high-expense category caused most of the overspend.",
        "Unexpected expenses can be managed with a small buffer fund.",
        "Tracking patterns over time reveals spending habits you might not notice day-to-day."
    ],
    investment: [
        "Market volatility affected short-term results — time reduces risk.",
        "Temporary drops are normal. Long-term investors benefit from staying the course.",
        "Diversification helps smooth out the bumps in any single investment."
    ],
    temptation: [
        "Impulse moments often pass within 24 hours.",
        "Having barriers in place makes it easier to pause and reconsider.",
        "Small wins against temptation build confidence over time."
    ],
    goal_withdrawal: [
        "Early withdrawals often feel necessary in the moment but less so later.",
        "Each goal is a commitment to your future self.",
        "Flexibility is healthy — but patterns reveal what matters most."
    ]
};

const REFLECTION_PROMPTS = {
    budget: "What would you like to try differently next month?",
    investment: "What did this experience teach you about your risk tolerance?",
    temptation: "What was going through your mind in that moment?",
    goal_withdrawal: "Looking back, how do you feel about this decision?"
};

function initializeReflectionLogs(profile) {
    if (!profile.reflectionLogs) {
        profile.reflectionLogs = [];
        saveProfile(profile);
    }
    return profile;
}

function generateReflectionId() {
    return 'rfl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getLastReflectionMonth(profile) {
    if (!profile.reflectionLogs || profile.reflectionLogs.length === 0) return 0;
    return Math.max(...profile.reflectionLogs.map(r => r.month));
}

function canTriggerReflection(profile) {
    const currentMonth = profile.budget?.month || 1;
    const lastReflectionMonth = getLastReflectionMonth(profile);
    return currentMonth - lastReflectionMonth >= 2;
}

function detectReflectionTrigger(profile, monthData) {
    const spendableIncome = getSpendableIncome(profile);
    
    if (monthData.totalSaved < 0) {
        return {
            context: 'budget',
            triggerEvent: 'Budget deficit month',
            observedOutcome: `Spending exceeded planned savings by ${formatCurrency(Math.abs(monthData.totalSaved))}.`
        };
    }
    
    const savingsRate = (monthData.savings / spendableIncome) * 100;
    if (savingsRate < 10 && monthData.savings < profile.income * 0.1) {
        return {
            context: 'budget',
            triggerEvent: 'Below savings target',
            observedOutcome: `Savings rate was ${savingsRate.toFixed(0)}% this month, below the recommended 10%.`
        };
    }
    
    return null;
}

function checkEarlyWithdrawalReflection(profile, walletName) {
    if (!canTriggerReflection(profile)) return null;
    
    return {
        context: 'goal_withdrawal',
        triggerEvent: `Early withdrawal from "${walletName}"`,
        observedOutcome: `You withdrew from your goal wallet before maturity.`
    };
}

function createReflectionLog(profile, triggerData) {
    const currentMonth = profile.budget?.month || 1;
    
    const autoInsights = AUTO_INSIGHTS[triggerData.context] || AUTO_INSIGHTS.budget;
    const autoInsight = autoInsights[Math.floor(Math.random() * autoInsights.length)];
    
    const reflection = {
        id: generateReflectionId(),
        month: currentMonth,
        context: triggerData.context,
        triggerEvent: triggerData.triggerEvent,
        observedOutcome: triggerData.observedOutcome,
        reflectionPrompt: REFLECTION_PROMPTS[triggerData.context],
        userReflection: null,
        autoInsight: autoInsight,
        acknowledged: false
    };
    
    profile.reflectionLogs.push(reflection);
    saveProfile(profile);
    
    return reflection;
}

function acknowledgeReflection(profile, reflectionId, userReflection = null) {
    const reflection = profile.reflectionLogs.find(r => r.id === reflectionId);
    if (reflection) {
        reflection.acknowledged = true;
        if (userReflection && userReflection.trim().length > 0) {
            reflection.userReflection = userReflection.trim().substring(0, 200);
        }
        saveProfile(profile);
    }
}

function showReflectionModal(profile, reflection) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay reflection-overlay';
    
    modal.innerHTML = `
        <div class="modal-content reflection-modal">
            <div class="reflection-header">
                <span class="reflection-icon">💭</span>
                <h2>A Moment to Reflect</h2>
            </div>
            
            <div class="reflection-context">
                <p class="reflection-outcome">${reflection.observedOutcome}</p>
            </div>
            
            <div class="reflection-question">
                <p class="reflection-prompt">${reflection.reflectionPrompt}</p>
                <textarea id="reflectionInput" maxlength="200" rows="3" placeholder="Optional — take a moment to think..."></textarea>
                <span class="char-count"><span id="reflectionCharCount">0</span>/200</span>
            </div>
            
            <div class="reflection-insight">
                <span class="insight-icon">💡</span>
                <p>${reflection.autoInsight}</p>
            </div>
            
            <div class="reflection-reminder">
                <p>Mistakes are data, not identity. Reflection builds awareness.</p>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-secondary" id="skipReflectionBtn">Skip for now</button>
                <button class="btn btn-primary" id="saveReflectionBtn">Continue</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    const reflectionInput = document.getElementById('reflectionInput');
    const charCount = document.getElementById('reflectionCharCount');
    
    reflectionInput.addEventListener('input', () => {
        charCount.textContent = reflectionInput.value.length;
    });
    
    document.getElementById('skipReflectionBtn').addEventListener('click', () => {
        const freshProfile = getProfile();
        acknowledgeReflection(freshProfile, reflection.id, null);
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
    
    document.getElementById('saveReflectionBtn').addEventListener('click', () => {
        const freshProfile = getProfile();
        const userText = reflectionInput.value.trim();
        acknowledgeReflection(freshProfile, reflection.id, userText);
        
        if (userText.length > 0) {
            showNotification('Reflection saved', 'success');
        }
        
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
}

function checkAndTriggerReflection(profile, monthData) {
    if (!canTriggerReflection(profile)) return;
    
    const trigger = detectReflectionTrigger(profile, monthData);
    if (trigger) {
        const reflection = createReflectionLog(profile, trigger);
        setTimeout(() => {
            showReflectionModal(getProfile(), reflection);
        }, 2000);
    }
}

// =================================================================
// TIME-TRAVEL LETTERS
// =================================================================
function initializeTimeTravelLetters(profile) {
    if (!profile.timeTravelLetters) {
        profile.timeTravelLetters = [];
        saveProfile(profile);
    }
    return profile;
}

function generateLetterId() {
    return 'ttl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function canWriteLetter(profile) {
    return !profile.budget?.allocated;
}

function createTimeTravelLetter(profile, { message, trigger, deliverMonth, tone }) {
    if (message.length > 300) {
        return { success: false, error: 'Message too long (max 300 characters)' };
    }
    
    const currentMonth = profile.budget?.month || 1;
    
    const letter = {
        id: generateLetterId(),
        writtenMonth: currentMonth,
        deliverMonth: deliverMonth || currentMonth + 3,
        trigger: trigger || 'month_start',
        tone: tone || 'encouraging',
        message: message,
        delivered: false,
        deliveredAt: null
    };
    
    profile.timeTravelLetters.push(letter);
    saveProfile(profile);
    
    return { success: true, letter };
}

function getPendingLettersForDelivery(profile, trigger) {
    const currentMonth = profile.budget?.month || 1;
    
    return profile.timeTravelLetters.filter(letter => {
        if (letter.delivered) return false;
        
        if (trigger === 'month_start' && letter.trigger === 'month_start') {
            return letter.deliverMonth <= currentMonth;
        }
        
        if (trigger === 'goal_milestone' && letter.trigger === 'goal_milestone') {
            return true;
        }
        
        if (trigger === 'custom' && letter.trigger === 'custom') {
            return letter.deliverMonth <= currentMonth;
        }
        
        return false;
    });
}

function markLetterDelivered(profile, letterId) {
    const letter = profile.timeTravelLetters.find(l => l.id === letterId);
    if (letter) {
        letter.delivered = true;
        letter.deliveredAt = profile.budget?.month || 1;
        saveProfile(profile);
    }
}

function showLetterDeliveryModal(profile, letter) {
    const monthsAgo = (profile.budget?.month || 1) - letter.writtenMonth;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay letter-delivery-overlay';
    
    const toneClass = letter.tone || 'encouraging';
    
    modal.innerHTML = `
        <div class="modal-content letter-modal letter-tone-${toneClass}">
            <div class="letter-header">
                <span class="letter-icon">✉️</span>
                <span class="letter-from">From: You, ${monthsAgo} month${monthsAgo !== 1 ? 's' : ''} ago</span>
            </div>
            <div class="letter-body">
                <p class="letter-message">"${letter.message}"</p>
            </div>
            <div class="letter-footer">
                <span class="letter-signature">— Your past self</span>
            </div>
            <button class="btn btn-primary letter-continue-btn" id="closeLetter">Continue</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    document.getElementById('closeLetter').addEventListener('click', () => {
        markLetterDelivered(profile, letter.id);
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
}

function checkAndDeliverLetters(profile, trigger = 'month_start') {
    const pendingLetters = getPendingLettersForDelivery(profile, trigger);
    
    if (pendingLetters.length > 0) {
        const letterToDeliver = pendingLetters[0];
        setTimeout(() => {
            showLetterDeliveryModal(profile, letterToDeliver);
        }, 1500);
    }
}

function showWriteLetterModal(profile, context = 'general') {
    if (!canWriteLetter(profile) && context === 'general') {
        showNotification('Letters can only be written at the start of a month', 'info');
        return;
    }
    
    const currentMonth = profile.budget?.month || 1;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'writeLetterModal';
    
    modal.innerHTML = `
        <div class="modal-content write-letter-modal">
            <h2>Write to Your Future Self</h2>
            <p class="letter-modal-subtitle">Write a note your future self would thank you for.</p>
            
            <div class="letter-form">
                <div class="form-group">
                    <label>Your Message</label>
                    <textarea id="letterMessage" maxlength="300" rows="4" placeholder="What would you want to remember when things get hard?"></textarea>
                    <span class="char-count"><span id="charCount">0</span>/300</span>
                </div>
                
                <div class="form-group">
                    <label>Deliver after...</label>
                    <div class="delivery-options">
                        <label class="delivery-option">
                            <input type="radio" name="deliveryTime" value="3" checked>
                            <span>3 months</span>
                        </label>
                        <label class="delivery-option">
                            <input type="radio" name="deliveryTime" value="6">
                            <span>6 months</span>
                        </label>
                        <label class="delivery-option">
                            <input type="radio" name="deliveryTime" value="12">
                            <span>12 months</span>
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Tone</label>
                    <div class="tone-options">
                        <label class="tone-option">
                            <input type="radio" name="letterTone" value="encouraging" checked>
                            <span class="tone-icon">💪</span>
                            <span>Encouraging</span>
                        </label>
                        <label class="tone-option">
                            <input type="radio" name="letterTone" value="proud">
                            <span class="tone-icon">🌟</span>
                            <span>Proud</span>
                        </label>
                        <label class="tone-option">
                            <input type="radio" name="letterTone" value="calm">
                            <span class="tone-icon">🌊</span>
                            <span>Calm reminder</span>
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="letter-info">
                <span class="info-icon">💡</span>
                <span>People who emotionally connect with their future self save more consistently.</span>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelLetterBtn">Cancel</button>
                <button class="btn btn-primary" id="sendLetterBtn" disabled>Send to Future</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    const messageInput = document.getElementById('letterMessage');
    const charCount = document.getElementById('charCount');
    const sendBtn = document.getElementById('sendLetterBtn');
    
    messageInput.addEventListener('input', () => {
        const len = messageInput.value.length;
        charCount.textContent = len;
        sendBtn.disabled = len < 10;
    });
    
    document.getElementById('cancelLetterBtn').addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
    
    document.getElementById('sendLetterBtn').addEventListener('click', () => {
        const message = messageInput.value.trim();
        const deliveryMonths = parseInt(modal.querySelector('input[name="deliveryTime"]:checked').value);
        const tone = modal.querySelector('input[name="letterTone"]:checked').value;
        
        const freshProfile = getProfile();
        const result = createTimeTravelLetter(freshProfile, {
            message: message,
            trigger: 'month_start',
            deliverMonth: currentMonth + deliveryMonths,
            tone: tone
        });
        
        if (result.success) {
            showNotification('Letter sent to your future self!', 'success');
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        } else {
            showNotification(result.error, 'error');
        }
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
    profile = initializeTimeTravelLetters(profile);
    profile = initializeReflectionLogs(profile);
    profile = initializeLifeEvents(profile);
    
    const walletResult = processFutureWalletContribution(profile);
    if (walletResult.contributed) {
        setTimeout(() => {
            showNotification(`${formatCurrency(walletResult.amount)} protected for your future!`, 'xp');
        }, 1000);
    }
    
    checkAndDeliverLetters(getProfile(), 'month_start');
    checkAndTriggerLifeEvent(getProfile());
    
    displayUserData(getProfile());
}

document.addEventListener('DOMContentLoaded', () => {
    loadUserData();

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
    
    const writeLetterBtn = document.getElementById('writeLetterBtn');
    if (writeLetterBtn) {
        writeLetterBtn.addEventListener('click', () => {
            const profile = getProfile();
            if (profile) showWriteLetterModal(profile);
        });
    }
});
