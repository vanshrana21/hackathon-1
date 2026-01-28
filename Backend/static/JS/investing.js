console.log('[investing.js] Script loaded');

const MARKET_ASSETS = [
    { id: 'STK_ALPHA', type: 'stock', name: 'AlphaTech', sector: 'Technology', basePrice: 240, volatility: 0.08, icon: '💻', description: 'High growth tech stock; higher volatility but potential for greater returns.' },
    { id: 'STK_BETA', type: 'stock', name: 'BetaFinance', sector: 'Finance', basePrice: 180, volatility: 0.06, icon: '🏦', description: 'Established financial services company; moderate growth potential.' },
    { id: 'STK_GAMMA', type: 'stock', name: 'GammaHealth', sector: 'Healthcare', basePrice: 320, volatility: 0.05, icon: '🏥', description: 'Healthcare sector stock; defensive with steady growth.' },
    { id: 'STK_DELTA', type: 'stock', name: 'DeltaEnergy', sector: 'Energy', basePrice: 150, volatility: 0.07, icon: '⚡', description: 'Energy sector stock; cyclical with market conditions.' },
    { id: 'MF_INDEX', type: 'mutual', name: 'Nifty Index Fund', sector: 'Diversified', basePrice: 100, volatility: 0.03, icon: '📊', description: 'Professionally managed fund tracking market index; lower risk through diversification.' },
    { id: 'MF_GROWTH', type: 'mutual', name: 'Growth Fund', sector: 'Growth', basePrice: 85, volatility: 0.04, icon: '🌱', description: 'Focuses on growth stocks; moderate risk with good return potential.' },
    { id: 'ETF_BANK', type: 'etf', name: 'Bank ETF', sector: 'Finance', basePrice: 120, volatility: 0.04, icon: '🏛️', description: 'Exchange-traded fund tracking banking sector; liquid and diversified.' },
    { id: 'ETF_IT', type: 'etf', name: 'IT Sector ETF', sector: 'Technology', basePrice: 200, volatility: 0.05, icon: '🖥️', description: 'Tracks IT sector performance; good tech exposure with lower single-stock risk.' },
    { id: 'FD_1Y', type: 'fd', name: '1-Year FD', sector: 'Fixed Income', basePrice: 0, volatility: 0, rate: 0.06, tenure: 12, icon: '🔒', description: 'Fixed deposit with guaranteed 6% annual return; zero risk, money locked for 1 year.' },
    { id: 'FD_3Y', type: 'fd', name: '3-Year FD', sector: 'Fixed Income', basePrice: 0, volatility: 0, rate: 0.07, tenure: 36, icon: '🔐', description: 'Fixed deposit with guaranteed 7% annual return; zero risk, money locked for 3 years.' }
];

const FEES = { stock: 0.002, mutual: 0, etf: 0.001, fd: 0 };
const MIN_MUTUAL_FUND = 1000;
const MIN_FD = 5000;

const XP_REWARDS = {
    firstInvestment: 25,
    fdMaturity: 20,
    diversification: 15,
    yearHolding: 50,
    samemonthLoss: -10
};

function getProfile() {
    const data = localStorage.getItem('finplay_profile');
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
}

function saveProfile(profile) {
    localStorage.setItem('finplay_profile', JSON.stringify(profile));
    if (window.SyncService) {
        window.SyncService.debouncedSave();
    }
}

function getPortfolio() {
    const data = localStorage.getItem('finplay_portfolio');
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
}

function savePortfolio(portfolio) {
    localStorage.setItem('finplay_portfolio', JSON.stringify(portfolio));
    if (window.SyncService) {
        window.SyncService.debouncedSave();
    }
}

function getMarket() {
    const data = localStorage.getItem('finplay_market');
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
}

function saveMarket(market) {
    localStorage.setItem('finplay_market', JSON.stringify(market));
    if (window.SyncService) {
        window.SyncService.debouncedSave();
    }
}

function initializePortfolio(profile) {
    let portfolio = getPortfolio();
    if (!portfolio) {
        portfolio = {
            cash: profile.balance,
            positions: [],
            transactions: [],
            market_scenario: 'bull',
            investMonth: profile.budget?.month || 1,
            achievements: { firstInvestment: false, fdMatured: false, diversified: false, yearHeld: false },
            startMonth: profile.budget?.month || 1
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

function formatCurrency(amount) {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function round(num, decimals = 4) {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function calculateLevel(xp) {
    return Math.floor(xp / 100) + 1;
}

function addXp(amount, silent = false) {
    const profile = getProfile();
    if (!profile) return;
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

function generateTxId() {
    const portfolio = getPortfolio();
    return `tx_${Date.now()}_${portfolio.transactions.length}`;
}

function getCurrentMonth() {
    const profile = getProfile();
    return profile?.budget?.month || 1;
}

function simulateMarketMonth(scenario) {
    const market = getMarket();
    const portfolio = getPortfolio();
    const changes = [];

    market.forEach((asset, index) => {
        if (asset.type === 'fd') return;

        let drift = 0;
        const vol = asset.volatility;

        switch (scenario) {
            case 'bull':
                drift = vol < 0.05 ? 0.03 : 0.06;
                break;
            case 'bear':
                drift = vol < 0.05 ? -0.03 : -0.06;
                break;
            case 'volatile':
                drift = (index % 2 === 0) ? 0.08 : -0.06;
                break;
            case 'flat':
                drift = (index % 2 === 0) ? 0.005 : -0.005;
                break;
        }

        drift *= (1 + vol);
        const oldPrice = asset.price;
        asset.price = round(asset.price * (1 + drift), 2);
        
        const position = portfolio.positions.find(p => p.id === asset.id);
        if (position) {
            position.current_price = asset.price;
            const change = asset.price - oldPrice;
            const pnlChange = change * position.quantity;
            changes.push({ name: asset.name, change: drift * 100, pnlChange, sector: asset.sector });
        }
    });

    saveMarket(market);
    
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
            
            portfolio.transactions.push({
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

function buyAsset(assetId, amount) {
    const portfolio = getPortfolio();
    const market = getMarket();
    const asset = market.find(a => a.id === assetId);

    if (!asset || asset.type === 'fd') return { success: false, error: 'Invalid asset' };

    if (asset.type === 'mutual' && amount < MIN_MUTUAL_FUND) {
        return { success: false, error: `Minimum investment for mutual funds is ${formatCurrency(MIN_MUTUAL_FUND)}` };
    }

    const fee = round(amount * FEES[asset.type], 2);
    const totalCost = amount + fee;

    if (totalCost > portfolio.cash) {
        return { success: false, error: 'Insufficient cash' };
    }

    const units = round(amount / asset.price, 4);
    portfolio.cash = round(portfolio.cash - totalCost, 2);

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
    const portfolio = getPortfolio();
    const market = getMarket();
    const position = portfolio.positions.find(p => p.id === assetId);
    const asset = market.find(a => a.id === assetId);

    if (!position || !asset) return { success: false, error: 'Position not found' };
    if (units > position.quantity) return { success: false, error: 'Cannot sell more than you own' };

    const saleValue = round(units * asset.price, 2);
    const fee = round(saleValue * FEES[asset.type], 2);
    const netProceeds = round(saleValue - fee, 2);

    const costBasis = units * position.avg_price;
    const pnl = saleValue - costBasis;

    if (pnl < 0 && position.buy_month === getCurrentMonth()) {
        addXp(XP_REWARDS.samemonthLoss);
    }

    portfolio.cash = round(portfolio.cash + netProceeds, 2);
    position.quantity = round(position.quantity - units, 4);

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
    const portfolio = getPortfolio();
    const currentMonth = getCurrentMonth();

    if (amount < MIN_FD) {
        return { success: false, error: `Minimum FD amount is ${formatCurrency(MIN_FD)}` };
    }
    if (amount > portfolio.cash) {
        return { success: false, error: 'Insufficient cash' };
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

    if (!portfolio.achievements.firstInvestment) {
        portfolio.achievements.firstInvestment = true;
        addXp(XP_REWARDS.firstInvestment);
    }

    return { success: true, maturityMonth, rate };
}

function calculatePortfolioMetrics() {
    const portfolio = getPortfolio();
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

function isMonthZero() {
    const profile = getProfile();
    return (profile?.budget?.monthHistory || []).length === 0;
}

function updateInvestingCTA() {
    const ctaContainer = document.getElementById('investingCTA');
    const ctaIcon = document.getElementById('ctaIcon');
    const ctaTitle = document.getElementById('ctaTitle');
    const ctaMessage = document.getElementById('ctaMessage');
    const ctaButton = document.getElementById('ctaButton');
    const portfolio = getPortfolio();
    
    const monthZero = isMonthZero();
    
    if (monthZero) {
        ctaContainer.style.display = 'flex';
        ctaContainer.className = 'investing-cta cta-locked';
        ctaIcon.textContent = '🔒';
        ctaTitle.textContent = 'Investing Locked';
        ctaMessage.textContent = 'Complete your first budget to unlock investing.';
        ctaButton.style.display = 'none';
    } else if (portfolio && portfolio.cash > 0 && portfolio.positions.length === 0) {
        ctaContainer.style.display = 'flex';
        ctaContainer.className = 'investing-cta cta-ready';
        ctaIcon.textContent = '🚀';
        ctaTitle.textContent = 'Ready to Invest';
        ctaMessage.textContent = `You have ${formatCurrency(portfolio.cash)} available to start building your portfolio.`;
        ctaButton.style.display = 'block';
        ctaButton.textContent = 'Start Investing';
    } else {
        ctaContainer.style.display = 'none';
    }
}

function updateMarketButtonStates() {
    const monthZero = isMonthZero();
    const portfolio = getPortfolio();
    
    document.querySelectorAll('.market-btn').forEach(btn => {
        if (monthZero) {
            btn.disabled = true;
            btn.classList.add('btn-disabled');
            btn.setAttribute('title', 'Complete your first month to unlock investing');
        } else if (portfolio && portfolio.cash <= 0) {
            const assetId = btn.dataset.assetId;
            const asset = MARKET_ASSETS.find(a => a.id === assetId);
            const position = portfolio.positions.find(p => p.id === assetId);
            if (!position && asset && asset.type !== 'fd') {
                btn.disabled = true;
                btn.classList.add('btn-disabled');
                btn.setAttribute('title', 'No cash available');
            }
        } else {
            btn.disabled = false;
            btn.classList.remove('btn-disabled');
            btn.removeAttribute('title');
        }
    });
    
    const advanceBtn = document.getElementById('advanceMonthBtn');
    const scenarioSelect = document.getElementById('scenarioSelect');
    if (monthZero) {
        advanceBtn.disabled = true;
        advanceBtn.setAttribute('title', 'Complete your first budget month first');
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
    
    document.getElementById('currentMonth').textContent = `Month ${getCurrentMonth()}`;
    document.getElementById('levelBadge').querySelector('span:last-child').textContent = `Level ${profile.level}`;
    document.getElementById('scenarioSelect').value = portfolio.market_scenario;
}

function updatePortfolioStats() {
    const metrics = calculatePortfolioMetrics();
    
    document.getElementById('cashBalance').textContent = formatCurrency(metrics.cash);
    document.getElementById('investedValue').textContent = formatCurrency(metrics.investedValue);
    document.getElementById('totalPortfolio').textContent = formatCurrency(metrics.totalPortfolio);
    
    const pnlEl = document.getElementById('totalPnL');
    const pnlIconEl = document.getElementById('pnlIcon');
    pnlEl.textContent = (metrics.totalPnL >= 0 ? '+' : '') + formatCurrency(metrics.totalPnL);
    pnlEl.style.color = metrics.totalPnL >= 0 ? 'var(--success)' : 'var(--error)';
    pnlIconEl.textContent = metrics.totalPnL >= 0 ? '📈' : '📉';
}

function renderMarket(filter = 'all') {
    const market = getMarket();
    const portfolio = getPortfolio();
    const container = document.getElementById('marketList');
    container.innerHTML = '';

    const filtered = filter === 'all' ? market : market.filter(a => a.type === filter);

    filtered.forEach(asset => {
        const position = portfolio.positions.find(p => p.id === asset.id);
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
            <button class="btn btn-secondary btn-sm market-btn" data-asset-id="${asset.id}">
                ${asset.type === 'fd' ? 'Open FD' : 'Trade'}
            </button>
        `;

        card.querySelector('.market-btn').addEventListener('click', () => {
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
    const emptyState = document.getElementById('emptyPortfolioState');

    if (portfolio.positions.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
        } else {
            container.innerHTML = `
                <div id="emptyPortfolioState" class="empty-portfolio-state">
                    <div class="empty-portfolio-icon">📭</div>
                    <h4>You haven't invested yet</h4>
                    <p>Start small — even one decision builds experience.</p>
                    <button class="btn btn-primary" id="makeFirstInvestmentBtn">Make First Investment</button>
                </div>
            `;
            wireFirstInvestmentButton();
        }
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

    if (portfolio.positions.length === 0) {
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

    if (portfolio.transactions.length === 0) {
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

let selectedAsset = null;

function openTradeModal(asset) {
    selectedAsset = asset;
    const portfolio = getPortfolio();
    const position = portfolio.positions.find(p => p.id === asset.id);

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
    document.getElementById('buyCashAfter').textContent = formatCurrency(portfolio.cash - total);

    const btn = document.getElementById('confirmBuyBtn');
    const isValid = amount > 0 && total <= portfolio.cash;
    if (selectedAsset.type === 'mutual' && amount < MIN_MUTUAL_FUND) {
        btn.disabled = true;
        btn.textContent = `Min ${formatCurrency(MIN_MUTUAL_FUND)}`;
    } else {
        btn.disabled = !isValid;
        btn.textContent = isValid ? 'Confirm Purchase' : 'Insufficient Cash';
    }
}

function updateSellPreview() {
    if (!selectedAsset) return;
    const units = parseFloat(document.getElementById('sellUnits').value) || 0;
    const portfolio = getPortfolio();
    const position = portfolio.positions.find(p => p.id === selectedAsset.id);
    const owned = position ? position.quantity : 0;

    const value = round(units * selectedAsset.price, 2);
    const fee = round(value * FEES[selectedAsset.type], 2);
    const total = value - fee;

    document.getElementById('sellValue').textContent = formatCurrency(value);
    document.getElementById('sellFeeAmount').textContent = formatCurrency(fee);
    document.getElementById('sellTotal').textContent = formatCurrency(total);
    document.getElementById('sellCashAfter').textContent = formatCurrency(portfolio.cash + total);

    const btn = document.getElementById('confirmSellBtn');
    btn.disabled = units <= 0 || units > owned;
    btn.textContent = units > owned ? 'Exceeds Holdings' : 'Confirm Sale';
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
    const btn = document.getElementById('confirmFdBtn');
    btn.disabled = amount < MIN_FD || amount > portfolio.cash;
    btn.textContent = amount < MIN_FD ? `Min ${formatCurrency(MIN_FD)}` : amount > portfolio.cash ? 'Insufficient Cash' : 'Open Fixed Deposit';
}

function advanceMonth() {
    const portfolio = getPortfolio();
    const profile = getProfile();
    const currentMonth = getCurrentMonth();

    const changes = simulateMarketMonth(portfolio.market_scenario);
    const matured = processFDMaturities(currentMonth + 1);

    profile.budget.month = currentMonth + 1;
    saveProfile(profile);

    checkYearHoldingBonus(currentMonth + 1);

    showMonthSummary(currentMonth, portfolio.market_scenario, changes, matured);
    refreshUI();
}

function showMonthSummary(month, scenario, changes, matured) {
    const scenarioNames = { bull: 'Bull Market', bear: 'Bear Market', volatile: 'Volatile', flat: 'Flat' };
    
    let html = `<div class="summary-scenario">Market: ${scenarioNames[scenario]}</div>`;
    
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
        btn.addEventListener('click', scrollToMarket);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializePage();

    const ctaButton = document.getElementById('ctaButton');
    if (ctaButton) {
        ctaButton.addEventListener('click', scrollToMarket);
    }

    wireFirstInvestmentButton();

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMarket(btn.dataset.filter);
        });
    });

    document.getElementById('scenarioSelect').addEventListener('change', (e) => {
        const portfolio = getPortfolio();
        portfolio.market_scenario = e.target.value;
        savePortfolio(portfolio);
    });

    document.getElementById('advanceMonthBtn').addEventListener('click', advanceMonth);

    document.querySelectorAll('.trade-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.trade-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('buyForm').style.display = tab.dataset.action === 'buy' ? 'block' : 'none';
            document.getElementById('sellForm').style.display = tab.dataset.action === 'sell' ? 'block' : 'none';
        });
    });

    document.getElementById('buyAmount').addEventListener('input', updateBuyPreview);
    document.getElementById('sellUnits').addEventListener('input', updateSellPreview);
    document.getElementById('fdAmount').addEventListener('input', updateFDPreview);
    document.querySelectorAll('input[name="fdTenure"]').forEach(r => r.addEventListener('change', updateFDPreview));

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

    document.getElementById('closeModalBtn').addEventListener('click', closeModals);
    document.getElementById('closeFdModalBtn').addEventListener('click', closeModals);
    document.getElementById('closeSummaryBtn').addEventListener('click', closeModals);

    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModals();
        });
    });
});
