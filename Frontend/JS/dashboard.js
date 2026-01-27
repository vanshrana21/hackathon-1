console.log('[dashboard.js] Script loaded successfully');

// =================================================================
// CONFIGURATION
// =================================================================
const XP_PER_LEVEL = 100;
const FUTURE_WALLET_PERCENT = 0.15; // 15% of income auto-saved

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
// The Future Self Wallet implements automatic savings by reserving
// 15% of monthly income BEFORE the user can budget or spend.
// This teaches the "Pay Yourself First" principle.
// =================================================================

function initializeFutureWallet(profile) {
    // Initialize futureWallet if it doesn't exist
    if (!profile.futureWallet) {
        profile.futureWallet = {
            balance: 0,
            monthlyContribution: 0,
            totalContributed: 0,
            lastContributionMonth: 0 // Track which month was last contributed
        };
        saveProfile(profile);
    }
    return profile;
}

function processFutureWalletContribution(profile) {
    // This runs at month START, BEFORE budgeting
    // Only contribute once per month (idempotent)
    
    const currentMonth = profile.budget?.month || 1;
    const lastContributionMonth = profile.futureWallet?.lastContributionMonth || 0;
    
    // Already contributed for this month - skip
    if (lastContributionMonth >= currentMonth) {
        return { contributed: false, amount: 0 };
    }
    
    // Calculate 15% of income
    const contribution = Math.floor(profile.income * FUTURE_WALLET_PERCENT);
    
    // Update Future Wallet
    profile.futureWallet.balance += contribution;
    profile.futureWallet.monthlyContribution = contribution;
    profile.futureWallet.totalContributed += contribution;
    profile.futureWallet.lastContributionMonth = currentMonth;
    
    saveProfile(profile);
    
    return { contributed: true, amount: contribution };
}

function getSpendableIncome(profile) {
    // Spendable income = income - future wallet contribution
    // This is what the user actually budgets with
    const contribution = Math.floor(profile.income * FUTURE_WALLET_PERCENT);
    return profile.income - contribution;
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
    
    // Update Future Self Wallet display
    updateFutureWalletUI(profile);
    
    updateBudgetUI(profile);
}

function updateFutureWalletUI(profile) {
    const walletCard = document.getElementById('futureWalletCard');
    if (!walletCard || !profile.futureWallet) return;
    
    document.getElementById('futureWalletBalance').textContent = formatCurrency(profile.futureWallet.balance);
    document.getElementById('futureWalletContribution').textContent = formatCurrency(profile.futureWallet.monthlyContribution);
    document.getElementById('futureWalletTotal').textContent = formatCurrency(profile.futureWallet.totalContributed);
}

function updateBudgetUI(profile) {
    const budget = profile.budget;
    const spendableIncome = getSpendableIncome(profile);
    
    document.getElementById('currentMonth').textContent = `Month ${budget.month}`;
    
    // Update spendable income display
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
    
    // Use SPENDABLE income (after Future Wallet contribution), not full income
    const spendableIncome = getSpendableIncome(profile);
    const needs = parseInt(document.getElementById('needsInput').value) || 0;
    const wants = parseInt(document.getElementById('wantsInput').value) || 0;
    const savings = parseInt(document.getElementById('savingsInput').value) || 0;
    
    const total = needs + wants + savings;
    const remaining = spendableIncome - total;
    
    document.getElementById('allocationTotal').textContent = formatCurrency(total);
    document.getElementById('allocationRemaining').textContent = formatCurrency(remaining);
    
    const allocateBtn = document.getElementById('allocateBudgetBtn');
    // Check against spendable income, not full income
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
    
    // Validate against spendable income
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
    
    // Calculate expense amounts based on SPENDABLE income
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
// END MONTH - Includes Future Wallet messaging
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
    
    // Calculate Future Wallet contribution for summary display
    const futureWalletContribution = profile.futureWallet?.monthlyContribution || 0;
    
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
    
    // Store month history with future wallet contribution
    profile.budget.monthHistory.push({
        month: profile.budget.month,
        needs: profile.budget.needs,
        wants: profile.budget.wants,
        savings: profile.budget.savings,
        totalSaved: profile.budget.savingsRemaining,
        futureWalletContribution: futureWalletContribution,
        xpEarned: xpBonus
    });
    
    profile.balance += profile.budget.savingsRemaining;
    
    // Advance to next month
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
    
    // Show month summary with Future Wallet info
    showMonthSummary(
        profile.budget.month - 1, 
        summary, 
        xpBonus, 
        profile.budget.savingsRemaining,
        futureWalletContribution
    );
    
    // Process Future Wallet contribution for the NEW month
    const freshProfile = getProfile();
    const walletResult = processFutureWalletContribution(freshProfile);
    if (walletResult.contributed) {
        setTimeout(() => {
            showNotification(`${formatCurrency(walletResult.amount)} protected for your future!`, 'xp');
        }, 500);
    }
    
    displayUserData(getProfile());
}

function showMonthSummary(month, summary, xpEarned, totalSaved, futureWalletContribution) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    // Educational message about Future Wallet
    const futureWalletMessage = futureWalletContribution > 0 
        ? `<div class="future-wallet-summary">
             <div class="fw-icon">🔐</div>
             <div class="fw-text">
               <strong>${formatCurrency(futureWalletContribution)}</strong> was automatically protected for your future before you spent anything.
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
    
    // Initialize budget state
    profile = initializeBudgetState(profile);
    
    // Initialize Future Self Wallet
    profile = initializeFutureWallet(profile);
    
    // Process Future Wallet contribution for current month
    // This is idempotent - won't run twice for the same month
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
});
