console.log("🔥 INVESTING.JS LOADED (PHASE 1 + PHASE 2):", window.location.pathname, new Date().toISOString());

/**
 * FinPlay Investing Module - PHASE 1 + PHASE 2
 * 
 * Phase 1: Investing Foundations
 * - Budget → Investing unlock
 * - Fixed investment amount (₹1,000)
 * - One-click Trade
 * - No selling
 * - Month-based simulation
 * 
 * Phase 2: Risk & Behavior Awareness
 * - Risk labels on assets
 * - Portfolio risk score
 * - Diversification detection & benefits
 * - Risk-adjusted market returns
 * - Behavior feedback
 * 
 * NO: Selling, rebalancing, SIPs, real charts
 */

// ========== MARKET ASSETS (STATIC DATA) ==========
const MARKET_ASSETS = [
    { id: 'STK_ALPHA', type: 'stock', name: 'AlphaTech', sector: 'Technology', basePrice: 1000, riskLevel: 'High', icon: '💻', description: 'High growth tech stock' },
    { id: 'STK_BETA', type: 'stock', name: 'BetaFinance', sector: 'Finance', basePrice: 1000, riskLevel: 'Medium', icon: '🏦', description: 'Established financial services' },
    { id: 'STK_GAMMA', type: 'stock', name: 'GammaHealth', sector: 'Healthcare', basePrice: 1000, riskLevel: 'Medium', icon: '🏥', description: 'Healthcare sector stock' },
    { id: 'MF_INDEX', type: 'mutual', name: 'Nifty Index Fund', sector: 'Diversified', basePrice: 1000, riskLevel: 'Low', icon: '📊', description: 'Tracks market index' },
    { id: 'MF_GROWTH', type: 'mutual', name: 'Growth Fund', sector: 'Growth', basePrice: 1000, riskLevel: 'Medium', icon: '🌱', description: 'Focuses on growth stocks' },
    { id: 'ETF_BANK', type: 'etf', name: 'Bank ETF', sector: 'Finance', basePrice: 1000, riskLevel: 'Medium', icon: '🏛️', description: 'Tracks banking sector' },
    { id: 'ETF_IT', type: 'etf', name: 'IT Sector ETF', sector: 'Technology', basePrice: 1000, riskLevel: 'Medium', icon: '🖥️', description: 'Tracks IT sector' },
    { id: 'FD_1Y', type: 'fd', name: '1-Year FD', sector: 'Fixed Income', basePrice: 5000, riskLevel: 'None', rate: 0.06, icon: '🔒', description: 'Guaranteed 6% return (Unlocks in higher levels)' }
];

const FIXED_INVESTMENT_AMOUNT = 1000;

// ========== XP REWARDS ==========
const XP_REWARDS = {
    firstInvestment: 10,
    monthAdvance: 5,
    firstDiversified: 5,
    holdThroughVolatility: 3
};

// ========== PHASE 2 STATE TRACKING ==========
let phase2State = {
    firstDiversifiedAwarded: false,
    lastPortfolioValue: 0
};

// ========== STORAGE KEYS ==========
const PROFILE_KEY = 'finplay_profile';
const DASHBOARD_STATE_KEY = 'finplay_dashboard_state';
const PORTFOLIO_KEY = 'finplay_portfolio';

// ========== STATE ACCESSORS ==========

function getProfile() {
    const data = localStorage.getItem(PROFILE_KEY);
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
}

function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    if (window.SyncService) window.SyncService.debouncedSave();
}

function getDashboardState() {
    const data = localStorage.getItem(DASHBOARD_STATE_KEY);
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
}

function saveDashboardState(state) {
    localStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify(state));
    if (window.SyncService) window.SyncService.debouncedSave();
}

function getPortfolio() {
    const data = localStorage.getItem(PORTFOLIO_KEY);
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
}

function savePortfolio(portfolio) {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
    if (window.SyncService) window.SyncService.debouncedSave();
}

// ========== UNLOCK CHECK (CRITICAL) ==========

function isInvestingUnlocked() {
    const dashState = getDashboardState();
    return dashState?.finance?.confirmedBudget === true;
}

// ========== INITIALIZATION ==========

function initializePortfolio(profile) {
    let portfolio = getPortfolio();
    if (!portfolio) {
        const dashState = getDashboardState();
        const income = dashState?.finance?.monthlyIncome || profile?.income || 40000;
        const protectedAmt = dashState?.finance?.protectedAmount || Math.round(income * 0.2);
        const spendable = income - protectedAmt;
        
        portfolio = {
            cash: spendable,
            holdings: [],
            month: 1,
            totalInvested: 0,
            firstInvestmentDone: false,
            firstDiversifiedAwarded: false
        };
        savePortfolio(portfolio);
    }
    
    phase2State.firstDiversifiedAwarded = portfolio.firstDiversifiedAwarded || false;
    
    return portfolio;
}

// ========== UTILITY FUNCTIONS ==========

function formatCurrency(amount) {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function getCurrentMonth() {
    const dashState = getDashboardState();
    return dashState?.experience?.month || getPortfolio()?.month || 1;
}

function calculateLevel(xp) {
    return Math.floor(xp / 100) + 1;
}

// ========== PHASE 2: RISK & DIVERSIFICATION ==========

function getRiskBadgeHTML(riskLevel) {
    const level = riskLevel?.toLowerCase() || 'medium';
    const icons = { low: '🟢', medium: '🟡', high: '🔴', none: '⚪' };
    return `<span class="risk-badge risk-${level}">${icons[level] || '🟡'} ${riskLevel || 'Medium'}</span>`;
}

function calculatePortfolioRiskScore() {
    const portfolio = getPortfolio();
    if (!portfolio || portfolio.holdings.length === 0) return { score: 0, label: '-' };
    
    let weightedRisk = 0;
    let totalValue = 0;
    
    portfolio.holdings.forEach(h => {
        const weight = h.currentValue;
        totalValue += weight;
        if (h.riskLevel === 'High') weightedRisk += weight * 3;
        else if (h.riskLevel === 'Medium') weightedRisk += weight * 2;
        else if (h.riskLevel === 'Low') weightedRisk += weight * 1;
    });
    
    const score = totalValue > 0 ? weightedRisk / totalValue : 0;
    let label = 'Low';
    if (score >= 2.5) label = 'High';
    else if (score >= 1.5) label = 'Medium';
    
    return { score, label };
}

function isDiversified() {
    const portfolio = getPortfolio();
    if (!portfolio || portfolio.holdings.length === 0) return false;
    
    const assetTypes = new Set(portfolio.holdings.map(h => h.type));
    const assetCount = portfolio.holdings.length;
    
    return assetTypes.size >= 2 || assetCount >= 3;
}

function checkAndAwardDiversificationXP() {
    if (phase2State.firstDiversifiedAwarded) return;
    
    if (isDiversified()) {
        phase2State.firstDiversifiedAwarded = true;
        const portfolio = getPortfolio();
        if (portfolio) {
            portfolio.firstDiversifiedAwarded = true;
            savePortfolio(portfolio);
        }
        addXp(XP_REWARDS.firstDiversified);
        showNotification('Portfolio Diversified! +5 XP', 'success');
    }
}

function getBehaviorFeedback(changes, scenario) {
    const portfolio = getPortfolio();
    const diversified = isDiversified();
    const totalChange = changes.reduce((sum, c) => sum + c.change, 0) / (changes.length || 1);
    
    if (changes.length === 0) {
        return "Start investing to see how your portfolio responds to market changes.";
    }
    
    if (diversified && Math.abs(totalChange) < 3) {
        return "💡 Diversification softened the impact this month. Different assets balance each other out.";
    }
    
    if (!diversified && Math.abs(totalChange) > 4) {
        return "⚠️ High concentration increased volatility. Consider spreading investments across asset types.";
    }
    
    if (scenario === 'bear' && totalChange < 0) {
        return "📉 Bear markets affect all investments. Long-term holding often recovers losses.";
    }
    
    if (scenario === 'bull' && totalChange > 0) {
        return "📈 Bull markets lift portfolios. Remember, this growth isn't guaranteed every month.";
    }
    
    return "📊 Your portfolio stayed relatively stable despite market fluctuations.";
}

// ========== XP SYSTEM ==========

function addXp(amount) {
    const profile = getProfile();
    if (!profile) return;
    
    const oldLevel = profile.level || 1;
    profile.xp = Math.max(0, (profile.xp || 0) + amount);
    profile.level = calculateLevel(profile.xp);
    saveProfile(profile);
    
    const dashState = getDashboardState();
    if (dashState?.experience) {
        dashState.experience.xp = profile.xp;
        dashState.experience.level = profile.level;
        saveDashboardState(dashState);
    }
    
    if (profile.level > oldLevel) {
        showNotification(`Level Up! You're now Level ${profile.level}!`, 'success');
    } else if (amount > 0) {
        showNotification(`+${amount} XP earned!`, 'xp');
    }
    
    updateHeaderUI();
}

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

// ========== MARKET SIMULATION (PHASE 1 + PHASE 2) ==========

function simulateMonthlyReturns(scenario) {
    const portfolio = getPortfolio();
    if (!portfolio || portfolio.holdings.length === 0) return [];
    
    const changes = [];
    const diversified = isDiversified();
    const volatilityReduction = diversified ? 0.8 : 1.0;
    
    portfolio.holdings.forEach(holding => {
        let baseReturn = 0;
        
        switch (scenario) {
            case 'bull':
                if (holding.riskLevel === 'High') {
                    baseReturn = 4 + Math.random() * 4;
                } else if (holding.riskLevel === 'Medium') {
                    baseReturn = 2 + Math.random() * 3;
                } else {
                    baseReturn = 1 + Math.random() * 2;
                }
                break;
            case 'bear':
                if (holding.riskLevel === 'High') {
                    baseReturn = -4 - Math.random() * 4;
                } else if (holding.riskLevel === 'Medium') {
                    baseReturn = -2 - Math.random() * 3;
                } else {
                    baseReturn = -0.5 - Math.random() * 1.5;
                }
                break;
            case 'sideways':
            default:
                if (holding.riskLevel === 'High') {
                    baseReturn = -1.5 + Math.random() * 3;
                } else if (holding.riskLevel === 'Medium') {
                    baseReturn = -1 + Math.random() * 2;
                } else {
                    baseReturn = -0.5 + Math.random() * 1;
                }
                break;
        }
        
        const returnPercent = baseReturn * volatilityReduction;
        
        const oldValue = holding.currentValue;
        holding.currentValue = Math.round(oldValue * (1 + returnPercent / 100));
        
        changes.push({
            name: holding.assetName,
            riskLevel: holding.riskLevel,
            oldValue,
            newValue: holding.currentValue,
            change: returnPercent
        });
    });
    
    savePortfolio(portfolio);
    return changes;
}

// ========== TRADE FUNCTION (PHASE 1 + PHASE 2) ==========

function tradeAsset(assetId) {
    console.log('🟢 TRADE: Attempting trade for', assetId);
    
    if (!isInvestingUnlocked()) {
        showNotification('Complete your monthly budget on the Dashboard to unlock investing.', 'error');
        console.log('🟢 TRADE: Blocked - investing locked');
        return { success: false };
    }
    
    const portfolio = getPortfolio();
    const asset = MARKET_ASSETS.find(a => a.id === assetId);
    
    if (!asset) {
        showNotification('Asset not found', 'error');
        return { success: false };
    }
    
    if (asset.type === 'fd') {
        showNotification('Fixed Deposits unlock in higher levels', 'info');
        return { success: false };
    }
    
    const investAmount = FIXED_INVESTMENT_AMOUNT;
    
    if (portfolio.cash < investAmount) {
        showNotification('Not enough virtual cash', 'error');
        console.log('🟢 TRADE: Blocked - insufficient cash', { cash: portfolio.cash, needed: investAmount });
        return { success: false };
    }
    
    portfolio.cash -= investAmount;
    portfolio.totalInvested += investAmount;
    
    let existing = portfolio.holdings.find(h => h.assetId === assetId);
    if (existing) {
        existing.investedAmount += investAmount;
        existing.currentValue += investAmount;
    } else {
        portfolio.holdings.push({
            assetId: assetId,
            assetName: asset.name,
            investedAmount: investAmount,
            currentValue: investAmount,
            riskLevel: asset.riskLevel,
            type: asset.type,
            icon: asset.icon
        });
    }
    
    if (!portfolio.firstInvestmentDone) {
        portfolio.firstInvestmentDone = true;
        savePortfolio(portfolio);
        addXp(XP_REWARDS.firstInvestment);
        showNotification(`First investment! Bought ${formatCurrency(investAmount)} of ${asset.name}`, 'success');
    } else {
        savePortfolio(portfolio);
        showNotification(`Invested ${formatCurrency(investAmount)} in ${asset.name}`, 'success');
    }
    
    checkAndAwardDiversificationXP();
    
    console.log('🟢 TRADE: Success', { asset: asset.name, amount: investAmount });
    refreshUI();
    return { success: true };
}

// ========== ADVANCE MONTH (PHASE 1 + PHASE 2) ==========

function advanceMonth() {
    console.log('🟢 ADVANCE MONTH: Starting');
    
    if (!isInvestingUnlocked()) {
        showNotification('Complete your monthly budget on the Dashboard first.', 'error');
        return;
    }
    
    const portfolio = getPortfolio();
    const dashState = getDashboardState();
    const scenario = portfolio.marketScenario || 'sideways';
    const currentMonth = getCurrentMonth();
    
    const previousValue = calculateMetrics().currentValue;
    
    console.log('🟢 ADVANCE MONTH: Month', currentMonth, 'Scenario', scenario);
    
    const changes = simulateMonthlyReturns(scenario);
    const newMonth = currentMonth + 1;
    
    if (dashState) {
        dashState.experience.month = newMonth;
        saveDashboardState(dashState);
    }
    
    portfolio.month = newMonth;
    savePortfolio(portfolio);
    
    addXp(XP_REWARDS.monthAdvance);
    
    const newValue = calculateMetrics().currentValue;
    if (previousValue > 0 && newValue < previousValue && portfolio.holdings.length > 0) {
        addXp(XP_REWARDS.holdThroughVolatility);
        console.log('🟢 ADVANCE MONTH: Held through volatility! +3 XP');
    }
    
    console.log('🟢 ADVANCE MONTH: Complete. New month:', newMonth);
    showMonthSummary(currentMonth, newMonth, scenario, changes);
    refreshUI();
}

function showMonthSummary(oldMonth, newMonth, scenario, changes) {
    const modal = document.getElementById('monthSummaryModal');
    const title = document.getElementById('summaryTitle');
    const content = document.getElementById('summaryContent');
    
    title.textContent = `Month ${oldMonth} → Month ${newMonth}`;
    
    const scenarioLabels = { bull: 'Bull Market', bear: 'Bear Market', sideways: 'Sideways Market' };
    const diversified = isDiversified();
    
    let html = `<div class="summary-scenario">Market: ${scenarioLabels[scenario] || 'Sideways Market'}</div>`;
    
    if (diversified) {
        html += `<div class="diversification-status diversified">
            <span class="diversification-icon">✓</span>
            <span>Portfolio is diversified (volatility reduced by 20%)</span>
        </div>`;
    }
    
    if (changes.length > 0) {
        html += '<div class="summary-section"><h4>Your Holdings</h4>';
        changes.forEach(c => {
            const sign = c.change >= 0 ? '+' : '';
            const changeClass = c.change >= 0 ? 'positive' : 'negative';
            html += `<div class="summary-change ${changeClass} risk-indicator">
                ${getRiskBadgeHTML(c.riskLevel)}
                <span>${c.name}: ${formatCurrency(c.oldValue)} → ${formatCurrency(c.newValue)} (${sign}${c.change.toFixed(1)}%)</span>
            </div>`;
        });
        html += '</div>';
        
        const feedback = getBehaviorFeedback(changes, scenario);
        html += `<div class="behavior-feedback">
            <p><span class="insight-icon">💡</span>${feedback}</p>
        </div>`;
    } else {
        html += '<p>No investments yet. Make your first investment to see results!</p>';
    }
    
    content.innerHTML = html;
    modal.classList.add('show');
}

// ========== PORTFOLIO METRICS ==========

function calculateMetrics() {
    const portfolio = getPortfolio();
    if (!portfolio) return { cash: 0, invested: 0, currentValue: 0, total: 0, pnl: 0 };
    
    let currentValue = 0;
    portfolio.holdings.forEach(h => {
        currentValue += h.currentValue;
    });
    
    const pnl = currentValue - portfolio.totalInvested;
    const total = portfolio.cash + currentValue;
    
    return {
        cash: portfolio.cash,
        invested: portfolio.totalInvested,
        currentValue,
        total,
        pnl
    };
}

// ========== UI RENDERING ==========

function updateHeaderUI() {
    const profile = getProfile();
    const portfolio = getPortfolio();
    
    const month = getCurrentMonth();
    const level = profile?.level || 1;
    
    document.getElementById('currentMonth').textContent = `Month ${month}`;
    document.getElementById('levelBadge').querySelector('span:last-child').textContent = `Level ${level}`;
    
    if (portfolio?.marketScenario) {
        document.getElementById('scenarioSelect').value = portfolio.marketScenario;
    }
}

function updatePortfolioStats() {
    const metrics = calculateMetrics();
    
    document.getElementById('cashBalance').textContent = formatCurrency(metrics.cash);
    document.getElementById('investedValue').textContent = formatCurrency(metrics.currentValue);
    document.getElementById('totalPortfolio').textContent = formatCurrency(metrics.total);
    
    const pnlEl = document.getElementById('totalPnL');
    const pnlIconEl = document.getElementById('pnlIcon');
    
    if (metrics.pnl === 0 && metrics.invested === 0) {
        pnlEl.textContent = '₹0';
        pnlEl.style.color = 'var(--text-secondary)';
        pnlIconEl.textContent = '📊';
    } else {
        pnlEl.textContent = (metrics.pnl >= 0 ? '+' : '') + formatCurrency(metrics.pnl);
        pnlEl.style.color = metrics.pnl >= 0 ? 'var(--success)' : 'var(--error)';
        pnlIconEl.textContent = metrics.pnl >= 0 ? '📈' : '📉';
    }
}

function updateInvestingCTA() {
    const ctaContainer = document.getElementById('investingCTA');
    const ctaIcon = document.getElementById('ctaIcon');
    const ctaTitle = document.getElementById('ctaTitle');
    const ctaMessage = document.getElementById('ctaMessage');
    const ctaButton = document.getElementById('ctaButton');
    const portfolio = getPortfolio();
    
    const unlocked = isInvestingUnlocked();
    
    if (!unlocked) {
        ctaContainer.style.display = 'flex';
        ctaContainer.className = 'investing-cta cta-locked';
        ctaIcon.textContent = '🔒';
        ctaTitle.textContent = 'Investing Locked';
        ctaMessage.textContent = 'Complete your monthly budget on the Dashboard to unlock investing.';
        ctaButton.style.display = 'none';
    } else if (portfolio && portfolio.holdings.length === 0) {
        ctaContainer.style.display = 'flex';
        ctaContainer.className = 'investing-cta cta-ready';
        ctaIcon.textContent = '🚀';
        ctaTitle.textContent = 'Ready to Invest';
        ctaMessage.textContent = `You have ${formatCurrency(portfolio.cash)} available. Click any Trade button below!`;
        ctaButton.style.display = 'block';
        ctaButton.textContent = 'Start Investing';
    } else {
        ctaContainer.style.display = 'none';
    }
}

function renderMarket(filter = 'all') {
    const portfolio = getPortfolio();
    const container = document.getElementById('marketList');
    const unlocked = isInvestingUnlocked();
    
    container.innerHTML = '';
    
    const filtered = filter === 'all' 
        ? MARKET_ASSETS.filter(a => a.type !== 'fd')
        : MARKET_ASSETS.filter(a => a.type === filter);
    
    filtered.forEach(asset => {
        const holding = portfolio?.holdings?.find(h => h.assetId === asset.id);
        const owned = holding ? holding.currentValue : 0;
        const canAfford = portfolio && portfolio.cash >= FIXED_INVESTMENT_AMOUNT;
        const isFD = asset.type === 'fd';
        
        const card = document.createElement('div');
        card.className = 'market-card';
        card.innerHTML = `
            ${getRiskBadgeHTML(asset.riskLevel)}
            <div class="market-card-icon">${asset.icon}</div>
            <div class="market-card-info">
                <div class="market-card-name">${asset.name}</div>
                <div class="market-card-meta">${asset.sector}</div>
            </div>
            <div class="market-card-price">
                ${isFD ? `${asset.rate * 100}% p.a.` : formatCurrency(FIXED_INVESTMENT_AMOUNT)}
            </div>
            ${owned > 0 ? `<div class="owned-badge">${formatCurrency(owned)} invested</div>` : ''}
            <button class="btn btn-secondary btn-sm market-btn" 
                    data-asset-id="${asset.id}" 
                    ${!unlocked || !canAfford || isFD ? 'disabled' : ''}
                    title="${!unlocked ? 'Complete your monthly budget to unlock' : !canAfford ? 'Not enough virtual cash' : isFD ? 'Unlocks in higher levels' : `Invest ${formatCurrency(FIXED_INVESTMENT_AMOUNT)}`}">
                ${isFD ? 'Locked' : 'Trade'}
            </button>
        `;
        
        const btn = card.querySelector('.market-btn');
        btn.addEventListener('click', () => {
            console.log('🟢 CLICKED: Trade Button', { assetId: asset.id, assetName: asset.name });
            tradeAsset(asset.id);
        });
        
        container.appendChild(card);
    });
}

function renderHoldings() {
    const portfolio = getPortfolio();
    const container = document.getElementById('holdingsList');
    
    if (!portfolio || portfolio.holdings.length === 0) {
        container.innerHTML = `
            <div id="emptyPortfolioState" class="empty-portfolio-state">
                <div class="empty-portfolio-icon">📭</div>
                <h4>You haven't invested yet</h4>
                <p>Start small — even one decision builds experience.</p>
                <button class="btn btn-primary" id="makeFirstInvestmentBtn" ${!isInvestingUnlocked() ? 'disabled' : ''}>
                    ${isInvestingUnlocked() ? 'Make First Investment' : 'Unlock by Confirming Budget'}
                </button>
            </div>
        `;
        wireFirstInvestmentButton();
        return;
    }
    
    container.innerHTML = '';
    portfolio.holdings.forEach(holding => {
        const pnl = holding.currentValue - holding.investedAmount;
        const pnlPercent = ((pnl / holding.investedAmount) * 100).toFixed(1);
        
        const item = document.createElement('div');
        item.className = 'holding-item';
        item.innerHTML = `
            <div class="holding-icon">${holding.icon || '📈'}</div>
            <div class="holding-info">
                <div class="holding-name">${holding.assetName}</div>
                <div class="holding-risk">
                    ${getRiskBadgeHTML(holding.riskLevel)}
                    <span class="holding-invested">Invested: ${formatCurrency(holding.investedAmount)}</span>
                </div>
            </div>
            <div class="holding-value">
                <div class="holding-current">${formatCurrency(holding.currentValue)}</div>
                <div class="holding-pnl ${pnl >= 0 ? 'positive' : 'negative'}">${pnl >= 0 ? '+' : ''}${pnlPercent}%</div>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderAllocation() {
    const portfolio = getPortfolio();
    const container = document.getElementById('allocationChart');
    const metrics = calculateMetrics();
    const riskScoreEl = document.getElementById('riskScore');
    
    if (!portfolio || portfolio.holdings.length === 0) {
        container.innerHTML = '<p class="empty-state">No allocation data</p>';
        riskScoreEl.textContent = '-';
        riskScoreEl.className = 'risk-value';
        return;
    }
    
    const allocation = { stock: 0, mutual: 0, etf: 0, cash: metrics.cash };
    portfolio.holdings.forEach(h => {
        allocation[h.type] = (allocation[h.type] || 0) + h.currentValue;
    });
    
    const total = metrics.total;
    const colors = { cash: '#64748B', stock: '#EF4444', mutual: '#10B981', etf: '#6366F1' };
    const labels = { cash: 'Cash', stock: 'Stocks', mutual: 'Mutual Funds', etf: 'ETFs' };
    
    container.innerHTML = '';
    Object.entries(allocation).forEach(([type, value]) => {
        if (value > 0) {
            const percent = (value / total) * 100;
            const bar = document.createElement('div');
            bar.className = 'allocation-bar';
            bar.innerHTML = `
                <div class="allocation-label">
                    <span style="color: ${colors[type]}">${labels[type]}</span>
                    <span>${percent.toFixed(1)}%</span>
                </div>
                <div class="allocation-track">
                    <div class="allocation-fill" style="width: ${percent}%; background: ${colors[type]}"></div>
                </div>
            `;
            container.appendChild(bar);
        }
    });
    
    const { score, label } = calculatePortfolioRiskScore();
    riskScoreEl.textContent = label;
    riskScoreEl.className = `risk-value risk-${label.toLowerCase()}`;
    
    const diversified = isDiversified();
    let existingDivStatus = container.parentElement.querySelector('.diversification-status');
    if (existingDivStatus) existingDivStatus.remove();
    
    if (portfolio.holdings.length > 0) {
        const divStatus = document.createElement('div');
        divStatus.className = `diversification-status ${diversified ? 'diversified' : 'not-diversified'}`;
        divStatus.innerHTML = diversified 
            ? '<span class="diversification-icon">✓</span><span>Diversified Portfolio</span>'
            : '<span class="diversification-icon">⚠</span><span>Consider diversifying (2+ asset types)</span>';
        container.parentElement.appendChild(divStatus);
    }
}

function renderTransactions() {
    const container = document.getElementById('transactionList');
    container.innerHTML = '<p class="empty-state">Transaction history unlocks in higher levels</p>';
}

// ========== UI REFRESH ==========

function refreshUI() {
    console.log('🟢 refreshUI: Updating all UI components');
    updateHeaderUI();
    updatePortfolioStats();
    updateInvestingCTA();
    renderMarket();
    renderHoldings();
    renderAllocation();
    renderTransactions();
}

function scrollToMarket() {
    const marketSection = document.querySelector('.market-section');
    if (marketSection) {
        marketSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function wireFirstInvestmentButton() {
    const btn = document.getElementById('makeFirstInvestmentBtn');
    if (btn) {
        btn.onclick = () => {
            console.log('🟢 CLICKED: Make First Investment Button');
            if (!isInvestingUnlocked()) {
                showNotification('Complete your monthly budget on the Dashboard to unlock investing.', 'error');
                return;
            }
            scrollToMarket();
        };
    }
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
}

// ========== INITIALIZATION ==========

async function initializePage() {
    console.log('🟢 initializePage: Starting Phase 1 initialization');
    
    try {
        if (window.SyncService) {
            await window.SyncService.initializeFromServer();
        }
    } catch (e) {
        console.warn('SyncService error (continuing):', e);
    }
    
    const profile = getProfile();
    console.log('🟢 initializePage: Profile check', { hasProfile: !!profile });
    
    if (!profile) {
        console.log('🟢 initializePage: No profile, redirecting to home');
        document.getElementById('loadingState').innerHTML = `
            <div class="spinner"></div>
            <p>No profile found. Redirecting...</p>
        `;
        setTimeout(() => { window.location.href = '/'; }, 1500);
        return;
    }
    
    initializePortfolio(profile);
    
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('investingContent').style.display = 'block';
    
    refreshUI();
    console.log('🟢 initializePage: Complete. Investing unlocked:', isInvestingUnlocked());
}

// ========== EVENT BINDINGS ==========

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🟢 DOMContentLoaded: Starting Phase 1');
    
    await initializePage();
    
    console.log('🟢 DOMContentLoaded: Wiring event handlers');
    
    const ctaButton = document.getElementById('ctaButton');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            console.log('🟢 CLICKED: CTA Button');
            if (!isInvestingUnlocked()) {
                showNotification('Complete your monthly budget on the Dashboard first.', 'error');
                return;
            }
            scrollToMarket();
        });
    }
    
    wireFirstInvestmentButton();
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            console.log('🟢 CLICKED: Filter Button', { filter });
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMarket(filter);
        });
    });
    
    const scenarioSelect = document.getElementById('scenarioSelect');
    if (scenarioSelect) {
        scenarioSelect.addEventListener('change', (e) => {
            console.log('🟢 CLICKED: Scenario Change', { scenario: e.target.value });
            if (!isInvestingUnlocked()) {
                showNotification('Complete your monthly budget to change scenario.', 'error');
                e.target.value = getPortfolio()?.marketScenario || 'sideways';
                return;
            }
            const portfolio = getPortfolio();
            portfolio.marketScenario = e.target.value;
            savePortfolio(portfolio);
            const labels = { bull: 'Bull Market', bear: 'Bear Market', sideways: 'Sideways Market' };
            showNotification(`Market scenario: ${labels[e.target.value]}`, 'info');
        });
    }
    
    const advanceBtn = document.getElementById('advanceMonthBtn');
    if (advanceBtn) {
        advanceBtn.addEventListener('click', () => {
            console.log('🟢 CLICKED: Advance Month Button');
            advanceMonth();
        });
    }
    
    const closeSummaryBtn = document.getElementById('closeSummaryBtn');
    if (closeSummaryBtn) {
        closeSummaryBtn.addEventListener('click', () => {
            console.log('🟢 CLICKED: Close Summary Modal');
            closeModals();
        });
    }
    
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('🟢 CLICKED: Modal Backdrop');
                closeModals();
            }
        });
    });
    
    console.log('🟢 Phase 1 initialization complete');
    console.log('🟢 Summary:');
    console.log('   - Market cards:', document.querySelectorAll('.market-card').length);
    console.log('   - Filter buttons:', document.querySelectorAll('.filter-btn').length);
    console.log('   - Investing unlocked:', isInvestingUnlocked());
});
