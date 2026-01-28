console.log("🔥 INVESTING.JS LOADED (PHASE 1 + 2 + 3 + 4):", window.location.pathname, new Date().toISOString());

/**
 * FinPlay Investing Module - PHASE 1 + PHASE 2 + PHASE 3 + PHASE 4
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
 * Phase 3: Life Events & Real-World Shocks
 * - Random life events during month advance
 * - Cash impacts (emergencies/bonuses)
 * - Investment impacts (market crashes)
 * - Stress state (freeze investing)
 * - Liquidity awareness
 * 
 * Phase 4: Long-Term Learning & Reflection
 * - Time compression simulation (5/10/20 years)
 * - Decision history timeline
 * - Behavior insights engine
 * - Strategy profile classification
 * - Financial literacy score
 * 
 * NO: Selling, rebalancing, SIPs, real charts, AI advice
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
    holdThroughVolatility: 3,
    handledEmergency: 5,
    survivedCrashDiversified: 5,
    completedLongTermSim: 10,
    reviewedFullHistory: 5
};

// ========== PHASE 4: STRATEGY PROFILES ==========
const STRATEGY_PROFILES = {
    conservativeBuilder: {
        name: 'Conservative Builder',
        icon: '🛡️',
        description: 'You prioritize stability over growth. Low-risk assets and cash reserves define your approach.'
    },
    balancedLearner: {
        name: 'Balanced Learner',
        icon: '⚖️',
        description: 'You spread risk across different assets. A thoughtful approach that adapts to market conditions.'
    },
    aggressiveExplorer: {
        name: 'Aggressive Explorer',
        icon: '🚀',
        description: 'You lean into high-risk assets seeking growth. Bold moves with higher volatility tolerance.'
    },
    volatilitySurvivor: {
        name: 'Volatility Survivor',
        icon: '🏆',
        description: 'You weathered market storms without panic. Patience and resilience mark your journey.'
    }
};

// ========== PHASE 3: LIFE EVENTS ==========
const LIFE_EVENTS = [
    {
        id: 'MEDICAL_EMERGENCY',
        title: 'Medical Emergency',
        type: 'Emergency',
        description: 'An unexpected health issue requires immediate attention.',
        cashImpactMin: -10000,
        cashImpactMax: -5000,
        investmentImpact: null,
        behaviorTag: 'Prepared',
        feedback: 'Emergency expenses are easier to handle with cash buffers.'
    },
    {
        id: 'JOB_BONUS',
        title: 'Job Bonus',
        type: 'Opportunity',
        description: 'Your hard work paid off — you received a performance bonus!',
        cashImpactMin: 5000,
        cashImpactMax: 10000,
        investmentImpact: null,
        behaviorTag: 'Disciplined',
        feedback: 'Bonuses are great for building emergency funds or investing wisely.'
    },
    {
        id: 'MARKET_CRASH',
        title: 'Market Crash News',
        type: 'Emergency',
        description: 'Breaking news: Global markets tumble on economic concerns.',
        cashImpactMin: 0,
        cashImpactMax: 0,
        investmentImpact: 'crash',
        behaviorTag: 'Prepared',
        feedback: 'Diversification reduced portfolio damage during the crash.'
    },
    {
        id: 'UNEXPECTED_EXPENSE',
        title: 'Unexpected Expense',
        type: 'Emergency',
        description: 'Your vehicle broke down and needs urgent repairs.',
        cashImpactMin: -6000,
        cashImpactMax: -3000,
        investmentImpact: null,
        behaviorTag: 'Prepared',
        feedback: 'Having cash prevented forced decisions during this expense.'
    },
    {
        id: 'SKILL_UPGRADE',
        title: 'Side Income',
        type: 'Opportunity',
        description: 'Your freelance project was successful — extra income this month!',
        cashImpactMin: 2000,
        cashImpactMax: 4000,
        investmentImpact: null,
        behaviorTag: 'Disciplined',
        feedback: 'Extra income reinforces good long-term financial habits.'
    }
];

const LIFE_EVENT_PROBABILITY = 0.30;

// ========== PHASE 2 STATE TRACKING ==========
let phase2State = {
    firstDiversifiedAwarded: false,
    lastPortfolioValue: 0
};

// ========== PHASE 3 STATE TRACKING ==========
let phase3State = {
    lastEventId: null,
    stressActive: false
};

// ========== PHASE 4 STATE TRACKING ==========
let phase4State = {
    longTermSimCompleted: false,
    historyReviewed: false
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
            firstDiversifiedAwarded: false,
            stressState: false,
            lastLifeEvent: null
        };
        savePortfolio(portfolio);
    }
    
    phase2State.firstDiversifiedAwarded = portfolio.firstDiversifiedAwarded || false;
    phase3State.stressActive = portfolio.stressState || false;
    phase3State.lastEventId = portfolio.lastLifeEvent?.id || null;
    
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

// ========== PHASE 3: LIFE EVENTS ==========

function maybeGetLifeEvent() {
    if (Math.random() > LIFE_EVENT_PROBABILITY) return null;
    const index = Math.floor(Math.random() * LIFE_EVENTS.length);
    return LIFE_EVENTS[index];
}

function calculateCashImpact(event) {
    if (!event || event.cashImpactMin === 0 && event.cashImpactMax === 0) return 0;
    const min = Math.min(event.cashImpactMin, event.cashImpactMax);
    const max = Math.max(event.cashImpactMin, event.cashImpactMax);
    return Math.round(min + Math.random() * (max - min));
}

function applyLifeEvent(event, portfolio) {
    if (!event) return { applied: false };
    
    const result = {
        applied: true,
        event,
        cashImpact: 0,
        investmentChanges: [],
        hadEnoughCash: true,
        stressTriggered: false,
        xpAwarded: 0
    };
    
    const cashImpact = calculateCashImpact(event);
    result.cashImpact = cashImpact;
    
    if (cashImpact !== 0) {
        const cashBefore = portfolio.cash;
        portfolio.cash += cashImpact;
        
        if (portfolio.cash < 0) {
            result.hadEnoughCash = false;
            result.stressTriggered = true;
            portfolio.cash = 0;
            portfolio.stressState = true;
            phase3State.stressActive = true;
        } else if (cashImpact < 0 && event.type === 'Emergency') {
            result.xpAwarded = XP_REWARDS.handledEmergency;
        }
    }
    
    if (event.investmentImpact === 'crash' && portfolio.holdings.length > 0) {
        const diversified = isDiversified();
        
        portfolio.holdings.forEach(holding => {
            const oldValue = holding.currentValue;
            let dropPercent;
            
            if (holding.riskLevel === 'High') {
                dropPercent = 8 + Math.random() * 7;
            } else if (holding.riskLevel === 'Medium') {
                dropPercent = 4 + Math.random() * 4;
            } else {
                dropPercent = 1 + Math.random() * 2;
            }
            
            if (diversified) {
                dropPercent *= 0.7;
            }
            
            holding.currentValue = Math.round(oldValue * (1 - dropPercent / 100));
            
            result.investmentChanges.push({
                name: holding.assetName,
                riskLevel: holding.riskLevel,
                oldValue,
                newValue: holding.currentValue,
                change: -dropPercent
            });
        });
        
        if (diversified) {
            result.xpAwarded = XP_REWARDS.survivedCrashDiversified;
        }
    }
    
    portfolio.lastLifeEvent = {
        id: event.id,
        title: event.title,
        type: event.type,
        cashImpact: result.cashImpact,
        month: portfolio.month
    };
    
    phase3State.lastEventId = event.id;
    
    return result;
}

function isInvestingFrozen() {
    const portfolio = getPortfolio();
    return portfolio?.stressState === true || phase3State.stressActive;
}

function clearStressState() {
    const portfolio = getPortfolio();
    if (portfolio) {
        portfolio.stressState = false;
        savePortfolio(portfolio);
    }
    phase3State.stressActive = false;
}

function getLifeEventFeedback(eventResult) {
    if (!eventResult?.applied) return null;
    
    const event = eventResult.event;
    
    if (eventResult.stressTriggered) {
        return "⚠️ Cash shortage! Investing is frozen next month. Build an emergency fund to avoid this.";
    }
    
    if (event.investmentImpact === 'crash') {
        if (isDiversified()) {
            return "💡 " + event.feedback;
        }
        return "📉 Market crash hit your portfolio hard. Diversification could have reduced the damage.";
    }
    
    return "💡 " + event.feedback;
}

// ========== PHASE 4: TIME COMPRESSION SIMULATION ==========

function runTimeCompression(years) {
    const portfolio = getPortfolio();
    if (!portfolio || portfolio.holdings.length === 0) {
        return { 
            success: false, 
            message: 'You need investments to run a long-term simulation.' 
        };
    }
    
    const months = years * 12;
    const diversified = isDiversified();
    
    let simHoldings = portfolio.holdings.map(h => ({
        ...h,
        simValue: h.currentValue
    }));
    
    let crisesSurvived = 0;
    let totalVolatility = 0;
    let bearMonths = 0;
    let bullMonths = 0;
    
    for (let m = 0; m < months; m++) {
        const rand = Math.random();
        let scenario;
        if (rand < 0.25) { scenario = 'bear'; bearMonths++; }
        else if (rand < 0.55) { scenario = 'bull'; bullMonths++; }
        else { scenario = 'sideways'; }
        
        const hasLifeEvent = Math.random() < 0.15;
        let crashThisMonth = false;
        
        if (hasLifeEvent && Math.random() < 0.2) {
            crashThisMonth = true;
            crisesSurvived++;
        }
        
        simHoldings.forEach(holding => {
            let returnPercent = 0;
            
            if (crashThisMonth) {
                if (holding.riskLevel === 'High') returnPercent = -8 - Math.random() * 7;
                else if (holding.riskLevel === 'Medium') returnPercent = -4 - Math.random() * 4;
                else returnPercent = -1 - Math.random() * 2;
                if (diversified) returnPercent *= 0.7;
            } else {
                switch (scenario) {
                    case 'bull':
                        if (holding.riskLevel === 'High') returnPercent = 3 + Math.random() * 5;
                        else if (holding.riskLevel === 'Medium') returnPercent = 2 + Math.random() * 3;
                        else returnPercent = 1 + Math.random() * 1.5;
                        break;
                    case 'bear':
                        if (holding.riskLevel === 'High') returnPercent = -3 - Math.random() * 4;
                        else if (holding.riskLevel === 'Medium') returnPercent = -1.5 - Math.random() * 2;
                        else returnPercent = -0.5 - Math.random() * 1;
                        break;
                    default:
                        if (holding.riskLevel === 'High') returnPercent = -1 + Math.random() * 2;
                        else if (holding.riskLevel === 'Medium') returnPercent = -0.5 + Math.random() * 1;
                        else returnPercent = 0 + Math.random() * 0.5;
                }
                if (diversified) returnPercent *= 0.9;
            }
            
            totalVolatility += Math.abs(returnPercent);
            holding.simValue = Math.max(100, Math.round(holding.simValue * (1 + returnPercent / 100)));
        });
    }
    
    const finalValue = simHoldings.reduce((sum, h) => sum + h.simValue, 0);
    const startValue = portfolio.holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalReturn = ((finalValue - startValue) / startValue) * 100;
    const avgVolatility = totalVolatility / months;
    
    return {
        success: true,
        years,
        months,
        startValue,
        finalValue,
        totalReturn,
        crisesSurvived,
        avgVolatility,
        diversified,
        bullMonths,
        bearMonths
    };
}

// ========== PHASE 4: DECISION HISTORY ==========

function getDecisionHistory() {
    const portfolio = getPortfolio();
    if (!portfolio) return [];
    
    const history = portfolio.decisionHistory || [];
    return history.slice(-20);
}

function recordDecision(type, details) {
    const portfolio = getPortfolio();
    if (!portfolio) return;
    
    if (!portfolio.decisionHistory) portfolio.decisionHistory = [];
    
    const entry = {
        month: portfolio.month,
        type,
        timestamp: Date.now(),
        portfolioValue: calculateMetrics().currentValue,
        diversified: isDiversified(),
        ...details
    };
    
    portfolio.decisionHistory.push(entry);
    
    if (portfolio.decisionHistory.length > 50) {
        portfolio.decisionHistory = portfolio.decisionHistory.slice(-50);
    }
    
    savePortfolio(portfolio);
}

// ========== PHASE 4: BEHAVIOR INSIGHTS ENGINE ==========

function generateBehaviorInsights() {
    const portfolio = getPortfolio();
    if (!portfolio || portfolio.month < 3) return [];
    
    const insights = [];
    const history = portfolio.decisionHistory || [];
    
    const diversifiedMonths = history.filter(h => h.diversified).length;
    const totalMonths = history.length;
    
    if (diversifiedMonths > totalMonths * 0.7 && totalMonths >= 3) {
        insights.push({
            icon: '🛡️',
            text: 'You maintained diversification most of the time. This likely reduced your volatility during market swings.'
        });
    } else if (diversifiedMonths < totalMonths * 0.3 && totalMonths >= 3) {
        insights.push({
            icon: '⚠️',
            text: 'Your portfolio was concentrated most of the time. This may have amplified both gains and losses.'
        });
    }
    
    const lifeEvents = history.filter(h => h.type === 'life_event');
    const emergencies = lifeEvents.filter(e => e.eventType === 'Emergency');
    const stressTriggers = emergencies.filter(e => e.stressTriggered);
    
    if (emergencies.length > 0 && stressTriggers.length === 0) {
        insights.push({
            icon: '💪',
            text: 'You handled all emergencies without cash shortage. Your liquidity buffer served you well.'
        });
    } else if (stressTriggers.length > 0) {
        insights.push({
            icon: '💡',
            text: `Cash shortages occurred ${stressTriggers.length} time(s). Building a larger emergency fund could prevent future freezes.`
        });
    }
    
    const holdingRisks = portfolio.holdings.map(h => h.riskLevel);
    const highRiskCount = holdingRisks.filter(r => r === 'High').length;
    const lowRiskCount = holdingRisks.filter(r => r === 'Low').length;
    
    if (highRiskCount > lowRiskCount && portfolio.holdings.length >= 2) {
        insights.push({
            icon: '🚀',
            text: 'You leaned toward high-risk investments. Higher potential returns come with higher volatility.'
        });
    } else if (lowRiskCount > highRiskCount && portfolio.holdings.length >= 2) {
        insights.push({
            icon: '🔒',
            text: 'You favored lower-risk investments. Steadier growth with less dramatic swings.'
        });
    }
    
    const invested = history.filter(h => h.type === 'investment').length;
    if (invested > 0 && portfolio.month > 3) {
        const investmentRate = invested / portfolio.month;
        if (investmentRate > 0.5) {
            insights.push({
                icon: '📈',
                text: 'Consistent investing behavior. Regular contributions often outperform timing attempts.'
            });
        }
    }
    
    if (insights.length === 0) {
        insights.push({
            icon: '📊',
            text: 'Keep making decisions to build your financial story. Patterns emerge over time.'
        });
    }
    
    return insights.slice(0, 5);
}

// ========== PHASE 4: STRATEGY PROFILE CLASSIFICATION ==========

function classifyStrategyProfile() {
    const portfolio = getPortfolio();
    if (!portfolio || portfolio.month < 3) return null;
    
    const history = portfolio.decisionHistory || [];
    const { label: riskLabel } = calculatePortfolioRiskScore();
    const diversified = isDiversified();
    
    const lifeEvents = history.filter(h => h.type === 'life_event');
    const crashes = lifeEvents.filter(e => e.investmentImpact === 'crash');
    const stressTriggers = lifeEvents.filter(e => e.stressTriggered);
    
    if (crashes.length >= 2 && diversified) {
        return 'volatilitySurvivor';
    }
    
    if (riskLabel === 'High' && portfolio.holdings.length >= 2) {
        return 'aggressiveExplorer';
    }
    
    if (riskLabel === 'Low' || (stressTriggers.length === 0 && portfolio.cash > portfolio.totalInvested * 0.3)) {
        return 'conservativeBuilder';
    }
    
    return 'balancedLearner';
}

// ========== PHASE 4: FINANCIAL LITERACY SCORE ==========

function calculateLiteracyScore() {
    const portfolio = getPortfolio();
    if (!portfolio) return { total: 0, breakdown: {} };
    
    const breakdown = {};
    let total = 0;
    
    const diversificationConsistency = portfolio.decisionHistory?.filter(h => h.diversified).length || 0;
    const totalEntries = portfolio.decisionHistory?.length || 1;
    const divScore = Math.min(25, Math.round((diversificationConsistency / totalEntries) * 25));
    breakdown.diversification = divScore;
    total += divScore;
    
    const lifeEvents = portfolio.decisionHistory?.filter(h => h.type === 'life_event') || [];
    const emergencies = lifeEvents.filter(e => e.eventType === 'Emergency');
    const handled = emergencies.filter(e => !e.stressTriggered).length;
    const survivalScore = emergencies.length > 0 
        ? Math.min(25, Math.round((handled / emergencies.length) * 25))
        : (portfolio.month >= 3 ? 15 : 5);
    breakdown.survival = survivalScore;
    total += survivalScore;
    
    const { score: riskScore } = calculatePortfolioRiskScore();
    let riskAlignScore = 15;
    if (riskScore > 0 && riskScore < 3) {
        riskAlignScore = 20;
    }
    if (portfolio.holdings.length >= 3) {
        riskAlignScore += 5;
    }
    breakdown.riskAlignment = Math.min(25, riskAlignScore);
    total += breakdown.riskAlignment;
    
    const stressCount = portfolio.decisionHistory?.filter(h => h.stressTriggered).length || 0;
    const stabilityScore = Math.max(0, 25 - (stressCount * 5));
    breakdown.stability = stabilityScore;
    total += stabilityScore;
    
    return { total: Math.min(100, total), breakdown };
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

// ========== TRADE FUNCTION (PHASE 1 + 2 + 3) ==========

function tradeAsset(assetId) {
    console.log('🟢 TRADE: Attempting trade for', assetId);
    
    if (!isInvestingUnlocked()) {
        showNotification('Complete your monthly budget on the Dashboard to unlock investing.', 'error');
        console.log('🟢 TRADE: Blocked - investing locked');
        return { success: false };
    }
    
    if (isInvestingFrozen()) {
        showNotification('Investing is frozen this month due to cash shortage. Advance to next month.', 'error');
        console.log('🟢 TRADE: Blocked - stress state active');
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
    
    recordDecision('investment', { assetName: asset.name, amount: investAmount, riskLevel: asset.riskLevel });
    
    checkAndAwardDiversificationXP();
    
    console.log('🟢 TRADE: Success', { asset: asset.name, amount: investAmount });
    refreshUI();
    return { success: true };
}

// ========== ADVANCE MONTH (PHASE 1 + 2 + 3) ==========

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
    
    const lifeEvent = maybeGetLifeEvent();
    let eventResult = { applied: false };
    
    if (lifeEvent) {
        console.log('🟢 ADVANCE MONTH: Life event triggered:', lifeEvent.title);
        eventResult = applyLifeEvent(lifeEvent, portfolio);
    }
    
    let changes = [];
    if (lifeEvent?.investmentImpact !== 'crash') {
        changes = simulateMonthlyReturns(scenario);
    } else {
        changes = eventResult.investmentChanges;
    }
    
    const newMonth = currentMonth + 1;
    
    if (dashState) {
        dashState.experience.month = newMonth;
        saveDashboardState(dashState);
    }
    
    portfolio.month = newMonth;
    
    if (portfolio.stressState && !eventResult.stressTriggered) {
        portfolio.stressState = false;
        phase3State.stressActive = false;
        console.log('🟢 ADVANCE MONTH: Stress state cleared');
    }
    
    savePortfolio(portfolio);
    
    addXp(XP_REWARDS.monthAdvance);
    
    if (eventResult.xpAwarded > 0) {
        addXp(eventResult.xpAwarded);
        console.log('🟢 ADVANCE MONTH: Life event XP awarded:', eventResult.xpAwarded);
    }
    
    const newValue = calculateMetrics().currentValue;
    if (previousValue > 0 && newValue < previousValue && portfolio.holdings.length > 0 && !eventResult.applied) {
        addXp(XP_REWARDS.holdThroughVolatility);
        console.log('🟢 ADVANCE MONTH: Held through volatility! +3 XP');
    }
    
    console.log('🟢 ADVANCE MONTH: Complete. New month:', newMonth);
    showMonthSummary(currentMonth, newMonth, scenario, changes, eventResult);
    refreshUI();
}

function showMonthSummary(oldMonth, newMonth, scenario, changes, eventResult = { applied: false }) {
    const modal = document.getElementById('monthSummaryModal');
    const title = document.getElementById('summaryTitle');
    const content = document.getElementById('summaryContent');
    
    title.textContent = `Month ${oldMonth} → Month ${newMonth}`;
    
    const scenarioLabels = { bull: 'Bull Market', bear: 'Bear Market', sideways: 'Sideways Market' };
    const diversified = isDiversified();
    
    let html = '';
    
    if (eventResult.applied) {
        const event = eventResult.event;
        const typeClass = event.type.toLowerCase();
        const typeIcons = { emergency: '🚨', opportunity: '🎁', neutral: '📋' };
        
        html += `<div class="life-event-banner life-event-${typeClass}">
            <div class="life-event-header">
                <span class="life-event-icon">${typeIcons[typeClass] || '📋'}</span>
                <span class="life-event-type">${event.type}</span>
            </div>
            <h4 class="life-event-title">${event.title}</h4>
            <p class="life-event-description">${event.description}</p>`;
        
        if (eventResult.cashImpact !== 0) {
            const impactClass = eventResult.cashImpact >= 0 ? 'positive' : 'negative';
            const impactSign = eventResult.cashImpact >= 0 ? '+' : '';
            html += `<div class="life-event-impact ${impactClass}">
                <span>Cash Impact:</span>
                <strong>${impactSign}${formatCurrency(eventResult.cashImpact)}</strong>
            </div>`;
        }
        
        if (eventResult.stressTriggered) {
            html += `<div class="life-event-warning">
                <span>⚠️</span>
                <span>Investing frozen next month due to cash shortage</span>
            </div>`;
        }
        
        html += '</div>';
    }
    
    html += `<div class="summary-scenario">Market: ${scenarioLabels[scenario] || 'Sideways Market'}</div>`;
    
    if (diversified) {
        html += `<div class="diversification-status diversified">
            <span class="diversification-icon">✓</span>
            <span>Portfolio is diversified (volatility reduced)</span>
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
    }
    
    let feedback;
    if (eventResult.applied) {
        feedback = getLifeEventFeedback(eventResult);
    } else {
        feedback = getBehaviorFeedback(changes, scenario);
    }
    
    if (feedback) {
        html += `<div class="behavior-feedback">
            <p><span class="insight-icon"></span>${feedback}</p>
        </div>`;
    }
    
    if (changes.length === 0 && !eventResult.applied) {
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
    const frozen = isInvestingFrozen();
    
    if (!unlocked) {
        ctaContainer.style.display = 'flex';
        ctaContainer.className = 'investing-cta cta-locked';
        ctaIcon.textContent = '🔒';
        ctaTitle.textContent = 'Investing Locked';
        ctaMessage.textContent = 'Complete your monthly budget on the Dashboard to unlock investing.';
        ctaButton.style.display = 'none';
    } else if (frozen) {
        ctaContainer.style.display = 'flex';
        ctaContainer.className = 'investing-cta cta-frozen';
        ctaIcon.textContent = '⚠️';
        ctaTitle.textContent = 'Investing Frozen';
        ctaMessage.textContent = 'Cash shortage this month. Advance to next month to resume investing.';
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
    const frozen = isInvestingFrozen();
    
    container.innerHTML = '';
    
    if (frozen) {
        container.innerHTML = `<div class="stress-state-banner">
            <span class="stress-icon">⚠️</span>
            <div class="stress-content">
                <strong>Investing Frozen</strong>
                <p>Due to cash shortage, you cannot invest this month. Advance to next month to resume.</p>
            </div>
        </div>`;
    }
    
    const filtered = filter === 'all' 
        ? MARKET_ASSETS.filter(a => a.type !== 'fd')
        : MARKET_ASSETS.filter(a => a.type === filter);
    
    filtered.forEach(asset => {
        const holding = portfolio?.holdings?.find(h => h.assetId === asset.id);
        const owned = holding ? holding.currentValue : 0;
        const canAfford = portfolio && portfolio.cash >= FIXED_INVESTMENT_AMOUNT;
        const isFD = asset.type === 'fd';
        const isDisabled = !unlocked || !canAfford || isFD || frozen;
        
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
                    ${isDisabled ? 'disabled' : ''}
                    title="${frozen ? 'Investing frozen this month' : !unlocked ? 'Complete your monthly budget to unlock' : !canAfford ? 'Not enough virtual cash' : isFD ? 'Unlocks in higher levels' : `Invest ${formatCurrency(FIXED_INVESTMENT_AMOUNT)}`}">
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

// ========== PHASE 4: UI RENDERING ==========

function renderTimeSimResult(result) {
    const container = document.getElementById('timeSimResult');
    if (!container) return;
    
    if (!result.success) {
        container.innerHTML = `<p class="empty-state">${result.message}</p>`;
        container.style.display = 'block';
        return;
    }
    
    const returnClass = result.totalReturn >= 0 ? 'positive' : 'negative';
    const returnSign = result.totalReturn >= 0 ? '+' : '';
    
    container.innerHTML = `
        <h4>${result.years}-Year Projection (${result.months} months)</h4>
        <div class="sim-stats">
            <div class="sim-stat">
                <div class="sim-stat-value ${returnClass}">${returnSign}${result.totalReturn.toFixed(1)}%</div>
                <div class="sim-stat-label">Total Return</div>
            </div>
            <div class="sim-stat">
                <div class="sim-stat-value">${formatCurrency(result.finalValue)}</div>
                <div class="sim-stat-label">Final Value</div>
            </div>
            <div class="sim-stat">
                <div class="sim-stat-value">${result.crisesSurvived}</div>
                <div class="sim-stat-label">Crises Survived</div>
            </div>
        </div>
        <div class="sim-summary">
            ${result.diversified ? '✓ Diversification reduced volatility by ~10%.' : '⚠ A diversified portfolio would have reduced volatility.'}
            <br>Market conditions: ${result.bullMonths} bull months, ${result.bearMonths} bear months.
            <br><em>This is a projection based on historical patterns, not a prediction.</em>
        </div>
    `;
    container.style.display = 'block';
}

function renderDecisionTimeline() {
    const container = document.getElementById('decisionTimeline');
    const reviewBtn = document.getElementById('reviewHistoryBtn');
    if (!container) return;
    
    const history = getDecisionHistory();
    
    if (history.length === 0) {
        container.innerHTML = '<p class="empty-state">Make investments and advance months to see your history</p>';
        if (reviewBtn) reviewBtn.style.display = 'none';
        return;
    }
    
    container.innerHTML = history.map(entry => {
        let actionText = '';
        let eventText = '';
        let tagClass = entry.diversified ? 'diversified' : 'concentrated';
        let tagText = entry.diversified ? 'Diversified' : 'Concentrated';
        
        if (entry.stressTriggered) {
            tagClass = 'frozen';
            tagText = 'Frozen';
        }
        
        switch (entry.type) {
            case 'investment':
                actionText = `Invested in ${entry.assetName}`;
                break;
            case 'month_advance':
                actionText = entry.scenario ? `Month advanced (${entry.scenario})` : 'Month advanced';
                break;
            case 'life_event':
                actionText = 'Life event occurred';
                eventText = entry.eventTitle || 'Unknown event';
                break;
            default:
                actionText = entry.type;
        }
        
        return `
            <div class="timeline-entry">
                <div class="timeline-month">M${entry.month}</div>
                <div class="timeline-content">
                    <div class="timeline-action">${actionText}</div>
                    ${eventText ? `<div class="timeline-event">${eventText}</div>` : ''}
                    <div class="timeline-value">Portfolio: ${formatCurrency(entry.portfolioValue)}</div>
                    <span class="timeline-tag ${tagClass}">${tagText}</span>
                </div>
            </div>
        `;
    }).join('');
    
    if (reviewBtn && history.length >= 5 && !phase4State.historyReviewed) {
        reviewBtn.style.display = 'block';
    }
}

function renderBehaviorInsights() {
    const container = document.getElementById('behaviorInsights');
    if (!container) return;
    
    const insights = generateBehaviorInsights();
    
    if (insights.length === 0) {
        container.innerHTML = '<p class="empty-state">Insights will appear after you\'ve made several decisions</p>';
        return;
    }
    
    container.innerHTML = insights.map(insight => `
        <div class="insight-item">
            <span class="insight-icon">${insight.icon}</span>
            <span class="insight-text">${insight.text}</span>
        </div>
    `).join('');
}

function renderStrategyProfile() {
    const profileNameEl = document.getElementById('profileName');
    const profileDescEl = document.getElementById('profileDescription');
    const profileIconEl = document.querySelector('.profile-icon');
    if (!profileNameEl) return;
    
    const profileKey = classifyStrategyProfile();
    
    if (!profileKey) {
        profileNameEl.textContent = '-';
        profileDescEl.textContent = 'Complete more months to discover your investing style.';
        if (profileIconEl) profileIconEl.textContent = '🎯';
        return;
    }
    
    const profile = STRATEGY_PROFILES[profileKey];
    profileNameEl.textContent = profile.name;
    profileDescEl.textContent = profile.description;
    if (profileIconEl) profileIconEl.textContent = profile.icon;
}

function renderLiteracyScore() {
    const scoreEl = document.getElementById('literacyScore');
    const breakdownEl = document.getElementById('scoreBreakdown');
    if (!scoreEl) return;
    
    const { total, breakdown } = calculateLiteracyScore();
    
    scoreEl.textContent = total;
    
    if (breakdownEl && Object.keys(breakdown).length > 0) {
        const labels = {
            diversification: 'Diversification',
            survival: 'Crisis Survival',
            riskAlignment: 'Risk Alignment',
            stability: 'Emotional Stability'
        };
        
        breakdownEl.innerHTML = Object.entries(breakdown).map(([key, value]) => `
            <div class="score-item">
                <span class="score-item-label">${labels[key] || key}</span>
                <span class="score-item-value">${value}/25</span>
            </div>
        `).join('');
    }
}

function renderPhase4() {
    renderDecisionTimeline();
    renderBehaviorInsights();
    renderStrategyProfile();
    renderLiteracyScore();
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
    renderPhase4();
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
    
    document.querySelectorAll('.time-sim-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const years = parseInt(btn.dataset.years);
            console.log('🟢 CLICKED: Time Simulation', { years });
            
            document.querySelectorAll('.time-sim-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const result = runTimeCompression(years);
            renderTimeSimResult(result);
            
            if (result.success && !phase4State.longTermSimCompleted) {
                phase4State.longTermSimCompleted = true;
                addXp(XP_REWARDS.completedLongTermSim);
                showNotification(`Completed ${years}-Year Simulation! +10 XP`, 'success');
            }
        });
    });
    
    const reviewHistoryBtn = document.getElementById('reviewHistoryBtn');
    if (reviewHistoryBtn) {
        reviewHistoryBtn.addEventListener('click', () => {
            console.log('🟢 CLICKED: Review History');
            if (!phase4State.historyReviewed) {
                phase4State.historyReviewed = true;
                addXp(XP_REWARDS.reviewedFullHistory);
                showNotification('Reviewed Full History! +5 XP', 'success');
                reviewHistoryBtn.style.display = 'none';
            }
        });
    }
    
    console.log('🟢 Phase 1-4 initialization complete');
    console.log('🟢 Summary:');
    console.log('   - Market cards:', document.querySelectorAll('.market-card').length);
    console.log('   - Filter buttons:', document.querySelectorAll('.filter-btn').length);
    console.log('   - Investing unlocked:', isInvestingUnlocked());
});
