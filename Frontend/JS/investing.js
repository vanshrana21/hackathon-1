console.log("🔥 INVESTING.JS LOADED:", window.location.pathname, new Date().toISOString());

/**
 * FinPlay Investing Module - Full Simulation Logic
 * 
 * State Flow:
 * - Reads user profile from 'finplay_profile' (name, level, xp, income)
 * - Reads dashboard state from 'finplay_dashboard_state' (budget confirmation, month)
 * - Maintains portfolio in 'finplay_portfolio' (cash, positions, transactions)
 * - Maintains market prices in 'finplay_market' (dynamic prices per asset)
 * 
 * Unlock Condition:
 * - Investing is LOCKED until dashboard budget is confirmed
 * - Reads confirmedBudget from finplay_dashboard_state.finance.confirmedBudget
 * 
 * Price Update Rules:
 * - Bull Market: +3% to +6% (higher for volatile assets)
 * - Bear Market: -3% to -7% (higher drops for volatile assets)
 * - Volatile: Alternating +6% / -5%
 * - Flat: ±1%
 */

console.log('[investing.js] Simulation module loaded');

// ========== MARKET ASSETS DEFINITION ==========
const MARKET_ASSETS = [
    { id: 'STK_ALPHA', type: 'stock', name: 'AlphaTech', sector: 'Technology', basePrice: 240, volatility: 0.08, risk: 'high', icon: '💻', description: 'High growth tech stock; higher volatility but potential for greater returns.' },
    { id: 'STK_BETA', type: 'stock', name: 'BetaFinance', sector: 'Finance', basePrice: 180, volatility: 0.06, risk: 'medium', icon: '🏦', description: 'Established financial services company; moderate growth potential.' },
    { id: 'STK_GAMMA', type: 'stock', name: 'GammaHealth', sector: 'Healthcare', basePrice: 320, volatility: 0.05, risk: 'medium', icon: '🏥', description: 'Healthcare sector stock; defensive with steady growth.' },
    { id: 'STK_DELTA', type: 'stock', name: 'DeltaEnergy', sector: 'Energy', basePrice: 150, volatility: 0.07, risk: 'high', icon: '⚡', description: 'Energy sector stock; cyclical with market conditions.' },
    { id: 'MF_INDEX', type: 'mutual', name: 'Nifty Index Fund', sector: 'Diversified', basePrice: 100, volatility: 0.03, risk: 'low', icon: '📊', description: 'Professionally managed fund tracking market index; lower risk through diversification.' },
    { id: 'MF_GROWTH', type: 'mutual', name: 'Growth Fund', sector: 'Growth', basePrice: 85, volatility: 0.04, risk: 'medium', icon: '🌱', description: 'Focuses on growth stocks; moderate risk with good return potential.' },
    { id: 'ETF_BANK', type: 'etf', name: 'Bank ETF', sector: 'Finance', basePrice: 120, volatility: 0.04, risk: 'medium', icon: '🏛️', description: 'Exchange-traded fund tracking banking sector; liquid and diversified.' },
    { id: 'ETF_IT', type: 'etf', name: 'IT Sector ETF', sector: 'Technology', basePrice: 200, volatility: 0.05, risk: 'medium', icon: '🖥️', description: 'Tracks IT sector performance; good tech exposure with lower single-stock risk.' },
    { id: 'FD_1Y', type: 'fd', name: '1-Year FD', sector: 'Fixed Income', basePrice: 0, volatility: 0, risk: 'none', rate: 0.06, tenure: 12, icon: '🔒', description: 'Fixed deposit with guaranteed 6% annual return; zero risk, money locked for 1 year.' },
    { id: 'FD_3Y', type: 'fd', name: '3-Year FD', sector: 'Fixed Income', basePrice: 0, volatility: 0, risk: 'none', rate: 0.07, tenure: 36, icon: '🔐', description: 'Fixed deposit with guaranteed 7% annual return; zero risk, money locked for 3 years.' }
];

// ========== CONSTANTS ==========
const FEES = { stock: 0.002, mutual: 0, etf: 0.001, fd: 0 };
const MIN_MUTUAL_FUND = 1000;
const MIN_FD = 5000;

const XP_REWARDS = {
    firstInvestment: 25,
    fdMaturity: 20,
    diversification: 15,
    yearHolding: 50,
    samemonthLoss: -10,
    monthAdvance: 5
};

const SCENARIO_LABELS = {
    bull: 'Bull Market',
    bear: 'Bear Market',
    volatile: 'Volatile',
    flat: 'Flat'
};

// ========== STORAGE KEYS ==========
const PROFILE_KEY = 'finplay_profile';
const DASHBOARD_STATE_KEY = 'finplay_dashboard_state';
const PORTFOLIO_KEY = 'finplay_portfolio';
const MARKET_KEY = 'finplay_market';

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

function getMarket() {
    const data = localStorage.getItem(MARKET_KEY);
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
}

function saveMarket(market) {
    localStorage.setItem(MARKET_KEY, JSON.stringify(market));
    if (window.SyncService) window.SyncService.debouncedSave();
}

// ========== UNLOCK CHECK (CRITICAL) ==========
// Investing is LOCKED until budget is confirmed on Dashboard

function isInvestingUnlocked() {
    const dashState = getDashboardState();
    // Check if budget has been confirmed
    return dashState?.finance?.confirmedBudget === true;
}

// ========== INITIALIZATION ==========

function initializePortfolio(profile) {
    let portfolio = getPortfolio();
    if (!portfolio) {
        const dashState = getDashboardState();
        // Calculate spendable from dashboard state
        const income = dashState?.finance?.monthlyIncome || profile?.income || 40000;
        const protectedAmt = dashState?.finance?.protectedAmount || Math.round(income * 0.2);
        const spendable = income - protectedAmt;
        
        portfolio = {
            cash: spendable,
            positions: [],
            transactions: [],
            market_scenario: 'bull',
            investMonth: 1,
            achievements: { firstInvestment: false, fdMatured: false, diversified: false, yearHeld: false },
            startMonth: 1
        };
        savePortfolio(portfolio);
    }
    return portfolio;
}

function initializeMarket() {
    let market = getMarket();
    if (!market) {
        market = MARKET_ASSETS.map(asset => ({
            ...asset,
            price: asset.basePrice
        }));
        saveMarket(market);
    }
    return market;
}

// ========== UTILITY FUNCTIONS ==========

function formatCurrency(amount) {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function round(num, decimals = 4) {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function calculateLevel(xp) {
    return Math.floor(xp / 100) + 1;
}

function generateTxId() {
    const portfolio = getPortfolio();
    return `tx_${Date.now()}_${portfolio?.transactions?.length || 0}`;
}

function getCurrentMonth() {
    const dashState = getDashboardState();
    return dashState?.experience?.month || 1;
}

// ========== XP SYSTEM ==========

function addXp(amount, silent = false) {
    const profile = getProfile();
    if (!profile) return;
    
    const oldLevel = profile.level || 1;
    profile.xp = Math.max(0, (profile.xp || 0) + amount);
    profile.level = calculateLevel(profile.xp);
    saveProfile(profile);
    
    // Also update dashboard state XP
    const dashState = getDashboardState();
    if (dashState?.experience) {
        dashState.experience.xp = profile.xp;
        dashState.experience.level = profile.level;
        saveDashboardState(dashState);
    }
    
    if (!silent) {
        if (profile.level > oldLevel) {
            showNotification(`Level Up! You're now Level ${profile.level}!`, 'success');
        } else if (amount > 0) {
            showNotification(`+${amount} XP earned!`, 'xp');
        } else if (amount < 0) {
            showNotification(`${amount} XP penalty!`, 'error');
        }
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

// ========== MARKET SIMULATION ==========
// Price update rules based on market scenario

function simulateMarketMonth(scenario) {
    const market = getMarket();
    const portfolio = getPortfolio();
    const changes = [];

    market.forEach((asset, index) => {
        if (asset.type === 'fd') return; // FDs don't have market prices

        let drift = 0;
        const vol = asset.volatility;

        // Price update rules per scenario
        switch (scenario) {
            case 'bull':
                // Bull: +3% to +6% (higher volatility = higher gains)
                drift = 0.03 + (vol * 0.5);
                break;
            case 'bear':
                // Bear: -3% to -7% (higher volatility = bigger drops)
                drift = -0.03 - (vol * 0.5);
                break;
            case 'volatile':
                // Volatile: alternating big swings
                drift = (index % 2 === 0) ? 0.06 + (vol * 0.3) : -0.05 - (vol * 0.2);
                break;
            case 'flat':
                // Flat: ±1%
                drift = (Math.random() - 0.5) * 0.02;
                break;
        }

        // Add some randomness factor
        const randomFactor = 1 + (Math.random() - 0.5) * 0.02;
        drift *= randomFactor;

        const oldPrice = asset.price;
        asset.price = round(Math.max(asset.price * (1 + drift), 1), 2);
        
        // Track changes for positions
        const position = portfolio.positions.find(p => p.id === asset.id);
        if (position) {
            position.current_price = asset.price;
            const change = asset.price - oldPrice;
            const pnlChange = change * position.quantity;
            changes.push({ 
                name: asset.name, 
                change: ((asset.price - oldPrice) / oldPrice) * 100, 
                pnlChange, 
                sector: asset.sector 
            });
        }
    });

    saveMarket(market);
    
    // Update position prices
    portfolio.positions.forEach(pos => {
        const asset = market.find(a => a.id === pos.id);
        if (asset) pos.current_price = asset.price;
    });
    savePortfolio(portfolio);

    return changes;
}

function processFDMaturities(currentMonth) {
    const portfolio = getPortfolio();
    const matured = [];

    portfolio.positions = portfolio.positions.filter(pos => {
        if (pos.type === 'fd' && pos.maturity_month <= currentMonth) {
            const interest = pos.principal * pos.rate * (pos.tenure / 12);
            const total = pos.principal + interest;
            portfolio.cash = round(portfolio.cash + total, 2);
            
            portfolio.transactions.unshift({
                tx_id: generateTxId(),
                date: `Month ${currentMonth}`,
                type: 'fd_mature',
                asset_id: pos.id,
                asset_type: 'fd',
                quantity: 1,
                price: total,
                cash_change: total
            });

            matured.push({ name: pos.name, principal: pos.principal, interest, total });

            if (!portfolio.achievements.fdMatured) {
                portfolio.achievements.fdMatured = true;
                addXp(XP_REWARDS.fdMaturity);
            }

            return false;
        }
        return true;
    });

    savePortfolio(portfolio);
    return matured;
}

// ========== ACHIEVEMENT CHECKS ==========

function checkDiversificationBonus() {
    const portfolio = getPortfolio();
    if (portfolio.achievements.diversified) return;

    const sectors = new Set();
    portfolio.positions.forEach(pos => {
        const asset = MARKET_ASSETS.find(a => a.id === pos.id);
        if (asset && asset.type !== 'fd') sectors.add(asset.sector);
    });

    if (sectors.size >= 3) {
        portfolio.achievements.diversified = true;
        savePortfolio(portfolio);
        addXp(XP_REWARDS.diversification);
        showNotification('+15 Experience — you explored diversification', 'success');
    }
}

function checkYearHoldingBonus(currentMonth) {
    const portfolio = getPortfolio();
    if (portfolio.achievements.yearHeld) return;

    if (currentMonth - portfolio.startMonth >= 12 && portfolio.positions.length > 0) {
        portfolio.achievements.yearHeld = true;
        savePortfolio(portfolio);
        addXp(XP_REWARDS.yearHolding);
        showNotification('+50 Experience — you practiced patience over 12 months', 'success');
    }
}

// ========== TRADING FUNCTIONS ==========

function buyAsset(assetId, amount) {
    // Check unlock status
    if (!isInvestingUnlocked()) {
        return { success: false, error: 'Complete your monthly budget to unlock investing.' };
    }

    const portfolio = getPortfolio();
    const market = getMarket();
    const asset = market.find(a => a.id === assetId);

    if (!asset || asset.type === 'fd') return { success: false, error: 'Invalid asset' };

    // Mutual fund minimum
    if (asset.type === 'mutual' && amount < MIN_MUTUAL_FUND) {
        return { success: false, error: `Minimum investment for mutual funds is ${formatCurrency(MIN_MUTUAL_FUND)}` };
    }

    const fee = round(amount * FEES[asset.type], 2);
    const totalCost = amount + fee;

    // Insufficient cash check
    if (totalCost > portfolio.cash) {
        return { success: false, error: 'Insufficient cash available' };
    }

    const units = round(amount / asset.price, 4);
    portfolio.cash = round(portfolio.cash - totalCost, 2);

    // Update or create position
    let position = portfolio.positions.find(p => p.id === assetId);
    if (position) {
        const totalCostBasis = position.avg_price * position.quantity + amount;
        position.quantity = round(position.quantity + units, 4);
        position.avg_price = round(totalCostBasis / position.quantity, 2);
        position.current_price = asset.price;
    } else {
        portfolio.positions.push({
            id: assetId,
            type: asset.type,
            name: asset.name,
            quantity: units,
            avg_price: asset.price,
            current_price: asset.price,
            buy_month: getCurrentMonth()
        });
    }

    portfolio.transactions.unshift({
        tx_id: generateTxId(),
        date: `Month ${getCurrentMonth()}`,
        type: 'buy',
        asset_id: assetId,
        asset_type: asset.type,
        quantity: units,
        price: asset.price,
        cash_change: -totalCost
    });

    // First investment bonus
    if (!portfolio.achievements.firstInvestment) {
        portfolio.achievements.firstInvestment = true;
        savePortfolio(portfolio);
        addXp(XP_REWARDS.firstInvestment);
        showNotification('+25 Experience — you made your first investment decision', 'success');
    } else {
        savePortfolio(portfolio);
    }

    checkDiversificationBonus();
    return { success: true, units, fee, total: totalCost };
}

function sellAsset(assetId, units) {
    // Check unlock status
    if (!isInvestingUnlocked()) {
        return { success: false, error: 'Complete your monthly budget to unlock investing.' };
    }

    const portfolio = getPortfolio();
    const market = getMarket();
    const position = portfolio.positions.find(p => p.id === assetId);
    const asset = market.find(a => a.id === assetId);

    if (!position || !asset) return { success: false, error: 'Position not found' };
    
    // Cannot sell more than owned
    if (units > position.quantity) return { success: false, error: 'Cannot sell more than you own' };

    const saleValue = round(units * asset.price, 2);
    const fee = round(saleValue * FEES[asset.type], 2);
    const netProceeds = round(saleValue - fee, 2);

    const costBasis = units * position.avg_price;
    const pnl = saleValue - costBasis;

    // Same-month loss penalty
    if (pnl < 0 && position.buy_month === getCurrentMonth()) {
        addXp(XP_REWARDS.samemonthLoss);
    }

    portfolio.cash = round(portfolio.cash + netProceeds, 2);
    position.quantity = round(position.quantity - units, 4);

    // Remove position if sold all
    if (position.quantity < 0.0001) {
        portfolio.positions = portfolio.positions.filter(p => p.id !== assetId);
    }

    portfolio.transactions.unshift({
        tx_id: generateTxId(),
        date: `Month ${getCurrentMonth()}`,
        type: 'sell',
        asset_id: assetId,
        asset_type: asset.type,
        quantity: units,
        price: asset.price,
        cash_change: netProceeds
    });

    savePortfolio(portfolio);
    return { success: true, proceeds: netProceeds, fee, pnl };
}

function openFD(tenure, amount) {
    // Check unlock status
    if (!isInvestingUnlocked()) {
        return { success: false, error: 'Complete your monthly budget to unlock investing.' };
    }

    const portfolio = getPortfolio();
    const currentMonth = getCurrentMonth();

    // Minimum FD amount
    if (amount < MIN_FD) {
        return { success: false, error: `Minimum FD amount is ${formatCurrency(MIN_FD)}` };
    }
    if (amount > portfolio.cash) {
        return { success: false, error: 'Insufficient cash available' };
    }

    const rate = tenure === 12 ? 0.06 : 0.07;
    const maturityMonth = currentMonth + tenure;
    const fdId = `FD_${Date.now()}`;

    portfolio.cash = round(portfolio.cash - amount, 2);
    portfolio.positions.push({
        id: fdId,
        type: 'fd',
        name: `FD ${tenure === 12 ? '1Y' : '3Y'} @${rate * 100}%`,
        quantity: 1,
        principal: amount,
        rate: rate,
        tenure: tenure,
        maturity_month: maturityMonth,
        current_price: amount
    });

    portfolio.transactions.unshift({
        tx_id: generateTxId(),
        date: `Month ${currentMonth}`,
        type: 'fd_open',
        asset_id: fdId,
        asset_type: 'fd',
        quantity: 1,
        price: amount,
        cash_change: -amount
    });

    savePortfolio(portfolio);

    // First investment bonus
    if (!portfolio.achievements.firstInvestment) {
        portfolio.achievements.firstInvestment = true;
        addXp(XP_REWARDS.firstInvestment);
    }

    return { success: true, maturityMonth, rate };
}

// ========== PORTFOLIO METRICS (REAL-TIME COMPUTED) ==========

function calculatePortfolioMetrics() {
    const portfolio = getPortfolio();
    if (!portfolio) return { cash: 0, investedValue: 0, totalPortfolio: 0, totalPnL: 0, riskScore: 0 };

    let investedValue = 0;
    let totalPnL = 0;
    let weightedVolatility = 0;
    let totalWeight = 0;

    portfolio.positions.forEach(pos => {
        if (pos.type === 'fd') {
            investedValue += pos.principal;
        } else {
            const currentValue = pos.quantity * pos.current_price;
            const costBasis = pos.quantity * pos.avg_price;
            investedValue += currentValue;
            totalPnL += currentValue - costBasis;

            const asset = MARKET_ASSETS.find(a => a.id === pos.id);
            if (asset) {
                weightedVolatility += asset.volatility * currentValue;
                totalWeight += currentValue;
            }
        }
    });

    const riskScore = totalWeight > 0 ? (weightedVolatility / totalWeight) * 100 : 0;
    const totalPortfolio = portfolio.cash + investedValue;

    return { cash: portfolio.cash, investedValue, totalPortfolio, totalPnL, riskScore };
}

// ========== UI UPDATE FUNCTIONS ==========

function updateInvestingCTA() {
    const ctaContainer = document.getElementById('investingCTA');
    const ctaIcon = document.getElementById('ctaIcon');
    const ctaTitle = document.getElementById('ctaTitle');
    const ctaMessage = document.getElementById('ctaMessage');
    const ctaButton = document.getElementById('ctaButton');
    const portfolio = getPortfolio();
    
    const unlocked = isInvestingUnlocked();
    
    if (!unlocked) {
        // LOCKED STATE - Show clear message
        ctaContainer.style.display = 'flex';
        ctaContainer.className = 'investing-cta cta-locked';
        ctaIcon.textContent = '🔒';
        ctaTitle.textContent = 'Investing Locked';
        ctaMessage.textContent = 'Complete your monthly budget on the Dashboard to unlock investing.';
        ctaButton.style.display = 'none';
    } else if (portfolio && portfolio.cash > 0 && portfolio.positions.length === 0) {
        // READY STATE - First time investor
        ctaContainer.style.display = 'flex';
        ctaContainer.className = 'investing-cta cta-ready';
        ctaIcon.textContent = '🚀';
        ctaTitle.textContent = 'Ready to Invest';
        ctaMessage.textContent = `You have ${formatCurrency(portfolio.cash)} available to start building your portfolio.`;
        ctaButton.style.display = 'block';
        ctaButton.textContent = 'Start Investing';
    } else {
        // Active investor - hide CTA
        ctaContainer.style.display = 'none';
    }
}

function updateMarketButtonStates() {
    const unlocked = isInvestingUnlocked();
    const portfolio = getPortfolio();
    
    // Update all trade buttons
    document.querySelectorAll('.market-btn').forEach(btn => {
        if (!unlocked) {
            btn.disabled = true;
            btn.classList.add('btn-disabled');
            btn.setAttribute('title', 'Complete your monthly budget to unlock investing');
        } else if (portfolio && portfolio.cash <= 0) {
            const assetId = btn.dataset.assetId;
            const position = portfolio.positions.find(p => p.id === assetId);
            if (!position) {
                btn.disabled = true;
                btn.classList.add('btn-disabled');
                btn.setAttribute('title', 'No cash available');
            } else {
                btn.disabled = false;
                btn.classList.remove('btn-disabled');
                btn.removeAttribute('title');
            }
        } else {
            btn.disabled = false;
            btn.classList.remove('btn-disabled');
            btn.removeAttribute('title');
        }
    });
    
    // Update advance month and scenario controls
    const advanceBtn = document.getElementById('advanceMonthBtn');
    const scenarioSelect = document.getElementById('scenarioSelect');
    
    if (!unlocked) {
        advanceBtn.disabled = true;
        advanceBtn.setAttribute('title', 'Complete your monthly budget first');
        scenarioSelect.disabled = true;
    } else {
        advanceBtn.disabled = false;
        advanceBtn.removeAttribute('title');
        scenarioSelect.disabled = false;
    }
}

function updateHeaderUI() {
    const profile = getProfile();
    const portfolio = getPortfolio();
    const dashState = getDashboardState();
    
    const month = dashState?.experience?.month || 1;
    const level = profile?.level || 1;
    
    document.getElementById('currentMonth').textContent = `Month ${month}`;
    document.getElementById('levelBadge').querySelector('span:last-child').textContent = `Level ${level}`;
    
    if (portfolio?.market_scenario) {
        document.getElementById('scenarioSelect').value = portfolio.market_scenario;
    }
}

function updatePortfolioStats() {
    const metrics = calculatePortfolioMetrics();
    
    // All values computed from state - NO hardcoded values
    document.getElementById('cashBalance').textContent = formatCurrency(metrics.cash);
    document.getElementById('investedValue').textContent = formatCurrency(metrics.investedValue);
    document.getElementById('totalPortfolio').textContent = formatCurrency(metrics.totalPortfolio);
    
    const pnlEl = document.getElementById('totalPnL');
    const pnlIconEl = document.getElementById('pnlIcon');
    
    if (metrics.totalPnL === 0 && metrics.investedValue === 0) {
        pnlEl.textContent = '₹0';
        pnlEl.style.color = 'var(--text-secondary)';
        pnlIconEl.textContent = '📊';
    } else {
        pnlEl.textContent = (metrics.totalPnL >= 0 ? '+' : '') + formatCurrency(metrics.totalPnL);
        pnlEl.style.color = metrics.totalPnL >= 0 ? 'var(--success)' : 'var(--error)';
        pnlIconEl.textContent = metrics.totalPnL >= 0 ? '📈' : '📉';
    }
}

function renderMarket(filter = 'all') {
    const market = getMarket();
    const portfolio = getPortfolio();
    const container = document.getElementById('marketList');
    const unlocked = isInvestingUnlocked();
    
    container.innerHTML = '';

    const filtered = filter === 'all' ? market : market.filter(a => a.type === filter);

    filtered.forEach(asset => {
        const position = portfolio?.positions?.find(p => p.id === asset.id);
        const owned = position ? position.quantity : 0;

        const card = document.createElement('div');
        card.className = 'market-card';
        card.innerHTML = `
            <div class="market-card-icon">${asset.icon}</div>
            <div class="market-card-info">
                <div class="market-card-name">${asset.name}</div>
                <div class="market-card-meta">${asset.sector} · ${asset.type.toUpperCase()}</div>
            </div>
            <div class="market-card-price">
                ${asset.type === 'fd' ? `${asset.rate * 100}% p.a.` : formatCurrency(asset.price)}
            </div>
            ${owned > 0 ? `<div class="owned-badge">${round(owned, 2)} owned</div>` : ''}
            <button class="btn btn-secondary btn-sm market-btn" data-asset-id="${asset.id}" ${!unlocked ? 'disabled title="Complete your monthly budget to unlock"' : ''}>
                ${asset.type === 'fd' ? 'Open FD' : 'Trade'}
            </button>
        `;

        card.querySelector('.market-btn').addEventListener('click', () => {
            if (!isInvestingUnlocked()) {
                showNotification('Complete your monthly budget on the Dashboard to unlock investing.', 'error');
                return;
            }
            if (asset.type === 'fd') {
                openFDModal(asset);
            } else {
                openTradeModal(asset);
            }
        });

        container.appendChild(card);
    });
    
    updateMarketButtonStates();
}

function renderHoldings() {
    const portfolio = getPortfolio();
    const container = document.getElementById('holdingsList');

    if (!portfolio || portfolio.positions.length === 0) {
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
    portfolio.positions.forEach(pos => {
        const isFd = pos.type === 'fd';
        let pnlPercent = 0;
        let pnlAmount = 0;

        if (!isFd) {
            const currentValue = pos.quantity * pos.current_price;
            const costBasis = pos.quantity * pos.avg_price;
            pnlAmount = currentValue - costBasis;
            pnlPercent = ((pos.current_price - pos.avg_price) / pos.avg_price) * 100;
        }

        const item = document.createElement('div');
        item.className = 'holding-item';
        item.innerHTML = `
            <div class="holding-info">
                <div class="holding-name">${pos.name}</div>
                <div class="holding-qty">${isFd ? `Matures: Month ${pos.maturity_month}` : `${round(pos.quantity, 2)} units @ ${formatCurrency(pos.avg_price)}`}</div>
            </div>
            <div class="holding-value">
                <div class="holding-current">${formatCurrency(isFd ? pos.principal : pos.quantity * pos.current_price)}</div>
                ${!isFd ? `<div class="holding-pnl ${pnlAmount >= 0 ? 'positive' : 'negative'}">${pnlAmount >= 0 ? '+' : ''}${pnlPercent.toFixed(1)}%</div>` : ''}
            </div>
        `;
        container.appendChild(item);
    });
}

function renderAllocation() {
    const portfolio = getPortfolio();
    const container = document.getElementById('allocationChart');
    const metrics = calculatePortfolioMetrics();

    if (!portfolio || portfolio.positions.length === 0) {
        container.innerHTML = '<p class="empty-state">No allocation data</p>';
        document.getElementById('riskScore').textContent = '-';
        return;
    }

    const allocation = { stock: 0, mutual: 0, etf: 0, fd: 0, cash: metrics.cash };
    portfolio.positions.forEach(pos => {
        if (pos.type === 'fd') {
            allocation.fd += pos.principal;
        } else {
            allocation[pos.type] += pos.quantity * pos.current_price;
        }
    });

    const total = metrics.totalPortfolio;
    const colors = { cash: '#64748B', stock: '#EF4444', mutual: '#10B981', etf: '#6366F1', fd: '#F59E0B' };
    const labels = { cash: 'Cash', stock: 'Stocks', mutual: 'Mutual Funds', etf: 'ETFs', fd: 'Fixed Deposits' };

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

    const riskLevel = metrics.riskScore < 3 ? 'Low' : metrics.riskScore < 5 ? 'Medium' : 'High';
    document.getElementById('riskScore').textContent = `${riskLevel} (${metrics.riskScore.toFixed(1)}%)`;
    document.getElementById('riskScore').className = `risk-value risk-${riskLevel.toLowerCase()}`;
}

function renderTransactions() {
    const portfolio = getPortfolio();
    const container = document.getElementById('transactionList');

    if (!portfolio || portfolio.transactions.length === 0) {
        container.innerHTML = '<p class="empty-state">No transactions yet</p>';
        return;
    }

    container.innerHTML = '';
    portfolio.transactions.slice(0, 10).forEach(tx => {
        const item = document.createElement('div');
        item.className = `transaction-item tx-${tx.type}`;
        const typeLabel = tx.type === 'buy' ? 'BUY' : tx.type === 'sell' ? 'SELL' : tx.type === 'fd_open' ? 'FD OPEN' : 'FD MATURE';
        item.innerHTML = `
            <div class="tx-info">
                <div class="tx-type">${typeLabel}</div>
                <div class="tx-date">${tx.date}</div>
            </div>
            <div class="tx-amount ${tx.cash_change >= 0 ? 'positive' : 'negative'}">
                ${tx.cash_change >= 0 ? '+' : ''}${formatCurrency(tx.cash_change)}
            </div>
        `;
        container.appendChild(item);
    });
}

// ========== MODAL HANDLING ==========

let selectedAsset = null;

function openTradeModal(asset) {
    if (!isInvestingUnlocked()) {
        showNotification('Complete your monthly budget on the Dashboard to unlock investing.', 'error');
        return;
    }

    selectedAsset = asset;
    const portfolio = getPortfolio();
    const position = portfolio?.positions?.find(p => p.id === asset.id);

    document.getElementById('modalAssetIcon').textContent = asset.icon;
    document.getElementById('modalAssetName').textContent = asset.name;
    document.getElementById('modalAssetType').textContent = `${asset.type.charAt(0).toUpperCase() + asset.type.slice(1)} · ${asset.sector}`;
    document.getElementById('modalPrice').textContent = formatCurrency(asset.price);
    document.getElementById('modalOwned').textContent = position ? `${round(position.quantity, 4)} units` : '0 units';
    document.getElementById('modalFee').textContent = `${FEES[asset.type] * 100}%`;
    document.getElementById('modalDescription').textContent = asset.description;

    document.getElementById('buyAmount').value = '';
    document.getElementById('sellUnits').value = '';
    updateBuyPreview();
    updateSellPreview();

    document.querySelectorAll('.trade-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.action === 'buy');
    });
    document.getElementById('buyForm').style.display = 'block';
    document.getElementById('sellForm').style.display = 'none';

    document.getElementById('tradeModal').classList.add('show');
}

function openFDModal() {
    if (!isInvestingUnlocked()) {
        showNotification('Complete your monthly budget on the Dashboard to unlock investing.', 'error');
        return;
    }

    document.getElementById('fdAmount').value = '';
    document.querySelector('input[name="fdTenure"][value="12"]').checked = true;
    updateFDPreview();
    document.getElementById('fdModal').classList.add('show');
}

function closeModals() {
    document.getElementById('tradeModal').classList.remove('show');
    document.getElementById('fdModal').classList.remove('show');
    document.getElementById('monthSummaryModal').classList.remove('show');
    selectedAsset = null;
}

function updateBuyPreview() {
    if (!selectedAsset) return;
    const amount = parseFloat(document.getElementById('buyAmount').value) || 0;
    const portfolio = getPortfolio();
    const fee = round(amount * FEES[selectedAsset.type], 2);
    const total = amount + fee;
    const units = amount > 0 ? round(amount / selectedAsset.price, 4) : 0;

    document.getElementById('buyUnits').textContent = units;
    document.getElementById('buyFeeAmount').textContent = formatCurrency(fee);
    document.getElementById('buyTotal').textContent = formatCurrency(total);
    document.getElementById('buyCashAfter').textContent = formatCurrency((portfolio?.cash || 0) - total);

    const btn = document.getElementById('confirmBuyBtn');
    const cash = portfolio?.cash || 0;
    const isValid = amount > 0 && total <= cash;
    
    if (selectedAsset.type === 'mutual' && amount < MIN_MUTUAL_FUND) {
        btn.disabled = true;
        btn.textContent = `Min ${formatCurrency(MIN_MUTUAL_FUND)}`;
    } else if (total > cash) {
        btn.disabled = true;
        btn.textContent = 'Insufficient Cash';
    } else {
        btn.disabled = !isValid;
        btn.textContent = isValid ? 'Confirm Purchase' : 'Enter Amount';
    }
}

function updateSellPreview() {
    if (!selectedAsset) return;
    const units = parseFloat(document.getElementById('sellUnits').value) || 0;
    const portfolio = getPortfolio();
    const position = portfolio?.positions?.find(p => p.id === selectedAsset.id);
    const owned = position ? position.quantity : 0;

    const value = round(units * selectedAsset.price, 2);
    const fee = round(value * FEES[selectedAsset.type], 2);
    const total = value - fee;

    document.getElementById('sellValue').textContent = formatCurrency(value);
    document.getElementById('sellFeeAmount').textContent = formatCurrency(fee);
    document.getElementById('sellTotal').textContent = formatCurrency(total);
    document.getElementById('sellCashAfter').textContent = formatCurrency((portfolio?.cash || 0) + total);

    const btn = document.getElementById('confirmSellBtn');
    if (units > owned) {
        btn.disabled = true;
        btn.textContent = 'Exceeds Holdings';
    } else if (units <= 0) {
        btn.disabled = true;
        btn.textContent = 'Enter Units';
    } else {
        btn.disabled = false;
        btn.textContent = 'Confirm Sale';
    }
}

function updateFDPreview() {
    const amount = parseFloat(document.getElementById('fdAmount').value) || 0;
    const tenure = parseInt(document.querySelector('input[name="fdTenure"]:checked').value);
    const rate = tenure === 12 ? 0.06 : 0.07;
    const interest = round(amount * rate * (tenure / 12), 2);
    const maturity = round(amount + interest, 2);
    const currentMonth = getCurrentMonth();

    document.getElementById('fdPrincipal').textContent = formatCurrency(amount);
    document.getElementById('fdInterest').textContent = formatCurrency(interest);
    document.getElementById('fdMaturity').textContent = formatCurrency(maturity);
    document.getElementById('fdMaturityMonth').textContent = `Month ${currentMonth + tenure}`;

    const portfolio = getPortfolio();
    const cash = portfolio?.cash || 0;
    const btn = document.getElementById('confirmFdBtn');
    
    if (amount < MIN_FD) {
        btn.disabled = true;
        btn.textContent = `Min ${formatCurrency(MIN_FD)}`;
    } else if (amount > cash) {
        btn.disabled = true;
        btn.textContent = 'Insufficient Cash';
    } else {
        btn.disabled = false;
        btn.textContent = 'Open Fixed Deposit';
    }
}

// ========== MONTH ADVANCEMENT ==========

function advanceMonth() {
    if (!isInvestingUnlocked()) {
        showNotification('Complete your monthly budget on the Dashboard first.', 'error');
        return;
    }

    const portfolio = getPortfolio();
    const dashState = getDashboardState();
    const currentMonth = getCurrentMonth();

    // Simulate market changes
    const changes = simulateMarketMonth(portfolio.market_scenario);
    const newMonth = currentMonth + 1;
    
    // Process FD maturities
    const matured = processFDMaturities(newMonth);

    // Update month in dashboard state
    if (dashState) {
        dashState.experience.month = newMonth;
        saveDashboardState(dashState);
    }

    // Update profile budget month
    const profile = getProfile();
    if (profile?.budget) {
        profile.budget.month = newMonth;
        saveProfile(profile);
    }

    portfolio.investMonth = newMonth;
    savePortfolio(portfolio);

    // Award XP for advancing
    addXp(XP_REWARDS.monthAdvance, true);
    checkYearHoldingBonus(newMonth);

    showMonthSummary(currentMonth, portfolio.market_scenario, changes, matured);
    refreshUI();
}

function showMonthSummary(month, scenario, changes, matured) {
    let html = `<div class="summary-scenario">Market: ${SCENARIO_LABELS[scenario] || scenario}</div>`;
    
    if (changes.length > 0) {
        html += '<div class="summary-section"><h4>Portfolio Changes</h4>';
        changes.forEach(c => {
            const sign = c.pnlChange >= 0 ? '+' : '';
            html += `<div class="summary-change ${c.pnlChange >= 0 ? 'positive' : 'negative'}">
                ${c.name}: ${sign}${c.change.toFixed(1)}% (${sign}${formatCurrency(c.pnlChange)})
            </div>`;
        });
        html += '</div>';
    }

    if (matured.length > 0) {
        html += '<div class="summary-section"><h4>FD Maturities</h4>';
        matured.forEach(fd => {
            html += `<div class="summary-maturity">
                ${fd.name}: ${formatCurrency(fd.principal)} + ${formatCurrency(fd.interest)} interest = ${formatCurrency(fd.total)}
            </div>`;
        });
        html += '</div>';
    }

    if (changes.length === 0 && matured.length === 0) {
        html += '<p>No changes to your portfolio this month.</p>';
    }

    document.getElementById('summaryTitle').textContent = `Month ${month} → Month ${month + 1}`;
    document.getElementById('summaryContent').innerHTML = html;
    document.getElementById('monthSummaryModal').classList.add('show');
}

// ========== UI REFRESH ==========

function refreshUI() {
    updateHeaderUI();
    updatePortfolioStats();
    updateInvestingCTA();
    renderMarket();
    updateMarketButtonStates();
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
        btn.addEventListener('click', () => {
            if (!isInvestingUnlocked()) {
                showNotification('Complete your monthly budget on the Dashboard to unlock investing.', 'error');
                return;
            }
            scrollToMarket();
        });
    }
}

// ========== INITIALIZATION ==========

async function initializePage() {
    if (window.SyncService) {
        await window.SyncService.initializeFromServer();
    }
    
    const profile = getProfile();
    if (!profile) {
        window.location.href = '/';
        return;
    }

    initializePortfolio(profile);
    initializeMarket();

    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('investingContent').style.display = 'block';

    refreshUI();
    console.log('[investing.js] Page initialized. Investing unlocked:', isInvestingUnlocked());
}

// ========== EVENT BINDINGS ==========

document.addEventListener('DOMContentLoaded', () => {
    initializePage();

    // CTA Button
    const ctaButton = document.getElementById('ctaButton');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            if (!isInvestingUnlocked()) {
                showNotification('Complete your monthly budget on the Dashboard first.', 'error');
                return;
            }
            scrollToMarket();
        });
    }

    wireFirstInvestmentButton();

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMarket(btn.dataset.filter);
        });
    });

    // Scenario selector
    document.getElementById('scenarioSelect').addEventListener('change', (e) => {
        if (!isInvestingUnlocked()) {
            showNotification('Complete your monthly budget to change market scenario.', 'error');
            e.target.value = getPortfolio()?.market_scenario || 'bull';
            return;
        }
        const portfolio = getPortfolio();
        portfolio.market_scenario = e.target.value;
        savePortfolio(portfolio);
        showNotification(`Market scenario changed to ${SCENARIO_LABELS[e.target.value]}`, 'info');
    });

    // Advance month
    document.getElementById('advanceMonthBtn').addEventListener('click', advanceMonth);

    // Trade tabs
    document.querySelectorAll('.trade-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.trade-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('buyForm').style.display = tab.dataset.action === 'buy' ? 'block' : 'none';
            document.getElementById('sellForm').style.display = tab.dataset.action === 'sell' ? 'block' : 'none';
        });
    });

    // Input previews
    document.getElementById('buyAmount').addEventListener('input', updateBuyPreview);
    document.getElementById('sellUnits').addEventListener('input', updateSellPreview);
    document.getElementById('fdAmount').addEventListener('input', updateFDPreview);
    document.querySelectorAll('input[name="fdTenure"]').forEach(r => r.addEventListener('change', updateFDPreview));

    // Confirm buy
    document.getElementById('confirmBuyBtn').addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('buyAmount').value);
        const result = buyAsset(selectedAsset.id, amount);
        if (result.success) {
            showNotification(`Bought ${result.units} units of ${selectedAsset.name}`, 'success');
            closeModals();
            refreshUI();
        } else {
            showNotification(result.error, 'error');
        }
    });

    // Confirm sell
    document.getElementById('confirmSellBtn').addEventListener('click', () => {
        const units = parseFloat(document.getElementById('sellUnits').value);
        const result = sellAsset(selectedAsset.id, units);
        if (result.success) {
            showNotification(`Sold for ${formatCurrency(result.proceeds)} (P&L: ${formatCurrency(result.pnl)})`, result.pnl >= 0 ? 'success' : 'info');
            closeModals();
            refreshUI();
        } else {
            showNotification(result.error, 'error');
        }
    });

    // Confirm FD
    document.getElementById('confirmFdBtn').addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('fdAmount').value);
        const tenure = parseInt(document.querySelector('input[name="fdTenure"]:checked').value);
        const result = openFD(tenure, amount);
        if (result.success) {
            showNotification(`FD opened! Matures at Month ${result.maturityMonth}`, 'success');
            closeModals();
            refreshUI();
        } else {
            showNotification(result.error, 'error');
        }
    });

    // Close modals
    document.getElementById('closeModalBtn').addEventListener('click', closeModals);
    document.getElementById('closeFdModalBtn').addEventListener('click', closeModals);
    document.getElementById('closeSummaryBtn').addEventListener('click', closeModals);

    // Backdrop close
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModals();
        });
    });
});
