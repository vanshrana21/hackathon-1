console.log('[analytics.js] Script loaded');

const MARKET_ASSETS = [
    { id: 'STK_ALPHA', type: 'stock', sector: 'Technology', volatility: 0.08 },
    { id: 'STK_BETA', type: 'stock', sector: 'Finance', volatility: 0.06 },
    { id: 'STK_GAMMA', type: 'stock', sector: 'Healthcare', volatility: 0.05 },
    { id: 'STK_DELTA', type: 'stock', sector: 'Energy', volatility: 0.07 },
    { id: 'MF_INDEX', type: 'mutual', sector: 'Diversified', volatility: 0.03 },
    { id: 'MF_GROWTH', type: 'mutual', sector: 'Growth', volatility: 0.04 },
    { id: 'ETF_BANK', type: 'etf', sector: 'Finance', volatility: 0.04 },
    { id: 'ETF_IT', type: 'etf', sector: 'Technology', volatility: 0.05 }
];

function getProfile() {
    const data = localStorage.getItem('finplay_profile');
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
}

function getPortfolio() {
    const data = localStorage.getItem('finplay_portfolio');
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
}

function formatCurrency(amount) {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function calculateSavingsRate(profile) {
    const monthHistory = profile.budget?.monthHistory || [];
    if (monthHistory.length === 0) {
        if (profile.budget?.allocated && profile.budget?.savings > 0) {
            return (profile.budget.savings / profile.income) * 100;
        }
        return 0;
    }
    
    let totalSavingsPercent = 0;
    monthHistory.forEach(month => {
        const rate = (month.savings / profile.income) * 100;
        totalSavingsPercent += rate;
    });
    
    return totalSavingsPercent / monthHistory.length;
}

function calculateBudgetDiscipline(profile) {
    const monthHistory = profile.budget?.monthHistory || [];
    if (monthHistory.length === 0) return 100;
    
    let disciplineScore = 0;
    monthHistory.forEach(() => {
        disciplineScore += 100;
    });
    
    return disciplineScore / monthHistory.length;
}

function calculateDiversification(portfolio) {
    if (!portfolio || !portfolio.positions || portfolio.positions.length === 0) {
        return { score: 0, assetTypes: 0, sectors: 0 };
    }
    
    const assetTypes = new Set();
    const sectors = new Set();
    
    portfolio.positions.forEach(pos => {
        assetTypes.add(pos.type);
        const asset = MARKET_ASSETS.find(a => a.id === pos.id);
        if (asset) {
            sectors.add(asset.sector);
        }
        if (pos.type === 'fd') {
            sectors.add('Fixed Income');
        }
    });
    
    const typeScore = Math.min(assetTypes.size / 4, 1) * 50;
    const sectorScore = Math.min(sectors.size / 5, 1) * 50;
    
    return {
        score: typeScore + sectorScore,
        assetTypes: assetTypes.size,
        sectors: sectors.size
    };
}

function calculateRiskBalance(portfolio, profile) {
    if (!portfolio || !portfolio.positions || portfolio.positions.length === 0) {
        return { score: 50, label: 'N/A' };
    }
    
    let totalValue = 0;
    let weightedVolatility = 0;
    let fdValue = 0;
    
    portfolio.positions.forEach(pos => {
        if (pos.type === 'fd') {
            fdValue += pos.principal;
            totalValue += pos.principal;
        } else {
            const value = pos.quantity * pos.current_price;
            totalValue += value;
            const asset = MARKET_ASSETS.find(a => a.id === pos.id);
            if (asset) {
                weightedVolatility += asset.volatility * value;
            }
        }
    });
    
    if (totalValue === 0) return { score: 50, label: 'N/A' };
    
    const avgVolatility = (weightedVolatility / totalValue) * 100;
    const fdRatio = fdValue / totalValue;
    
    let idealVolatility = 5;
    if (profile.life_stage === 'Student') idealVolatility = 4;
    else if (profile.life_stage === 'Independent Adult') idealVolatility = 6;
    
    const volatilityDiff = Math.abs(avgVolatility - idealVolatility);
    const volatilityScore = Math.max(0, 100 - volatilityDiff * 15);
    
    const fdScore = fdRatio > 0 ? Math.min(fdRatio * 100, 30) : 0;
    const finalScore = (volatilityScore * 0.7) + (fdScore);
    
    let label = 'Balanced';
    if (avgVolatility < 3) label = 'Conservative';
    else if (avgVolatility > 6) label = 'Aggressive';
    
    return { score: Math.min(finalScore, 100), label };
}

function calculateConsistency(profile) {
    const monthHistory = profile.budget?.monthHistory || [];
    if (monthHistory.length === 0) return 0;
    
    let consecutivePositive = 0;
    for (let i = monthHistory.length - 1; i >= 0; i--) {
        if (monthHistory[i].totalSaved >= 0) {
            consecutivePositive++;
        } else {
            break;
        }
    }
    
    return consecutivePositive;
}

function calculateHealthScore(profile, portfolio) {
    const savingsRate = calculateSavingsRate(profile);
    const budgetDiscipline = calculateBudgetDiscipline(profile);
    const diversification = calculateDiversification(portfolio);
    const riskBalance = calculateRiskBalance(portfolio, profile);
    const consistencyMonths = calculateConsistency(profile);
    
    const savingsScore = Math.min(savingsRate / 25 * 100, 100);
    const consistencyScore = Math.min(consistencyMonths / 6 * 100, 100);
    
    const totalScore = 
        (savingsScore * 0.30) +
        (budgetDiscipline * 0.20) +
        (diversification.score * 0.25) +
        (riskBalance.score * 0.15) +
        (consistencyScore * 0.10);
    
    return {
        total: Math.round(totalScore),
        components: {
            savingsRate: { value: savingsRate.toFixed(1), score: savingsScore },
            budgetDiscipline: { value: budgetDiscipline.toFixed(0), score: budgetDiscipline },
            diversification: { value: `${diversification.assetTypes + diversification.sectors}/5`, score: diversification.score },
            riskBalance: { value: riskBalance.label, score: riskBalance.score },
            consistency: { value: `${consistencyMonths} months`, score: consistencyScore }
        }
    };
}

function generateInsights(profile, portfolio) {
    const insights = [];
    const savingsRate = calculateSavingsRate(profile);
    const diversification = calculateDiversification(portfolio);
    const monthHistory = profile.budget?.monthHistory || [];
    
    if (savingsRate >= 20) {
        insights.push({
            icon: '💪',
            text: `You save ${savingsRate.toFixed(0)}% of your income on average (recommended: 20%). Excellent discipline!`,
            type: 'positive'
        });
    } else if (savingsRate > 0) {
        insights.push({
            icon: '📊',
            text: `Your average savings rate is ${savingsRate.toFixed(0)}%. Aim for 20% to build wealth faster.`,
            type: 'warning'
        });
    } else {
        insights.push({
            icon: '💡',
            text: `Start allocating a budget to see your savings rate. The 50/30/20 rule is a good starting point.`,
            type: 'neutral'
        });
    }
    
    if (diversification.sectors >= 3) {
        insights.push({
            icon: '🎯',
            text: `You diversified across ${diversification.sectors} sectors — this reduces portfolio volatility.`,
            type: 'positive'
        });
    } else if (portfolio && portfolio.positions && portfolio.positions.length > 0) {
        insights.push({
            icon: '⚠️',
            text: `Consider diversifying across more sectors. You're currently in ${diversification.sectors} sector(s).`,
            type: 'warning'
        });
    }
    
    const consistencyMonths = calculateConsistency(profile);
    if (consistencyMonths >= 3) {
        insights.push({
            icon: '🔥',
            text: `${consistencyMonths} consecutive months without going negative. Consistency builds wealth!`,
            type: 'positive'
        });
    }
    
    const hasFD = portfolio?.positions?.some(p => p.type === 'fd');
    if (hasFD) {
        insights.push({
            icon: '🔒',
            text: `Fixed deposits provide guaranteed returns — great for emergency fund stability.`,
            type: 'positive'
        });
    }
    
    if (monthHistory.length > 1) {
        const firstMonth = monthHistory[0];
        const lastMonth = monthHistory[monthHistory.length - 1];
        const improvement = lastMonth.savings - firstMonth.savings;
        if (improvement > 0) {
            insights.push({
                icon: '📈',
                text: `Your savings allocation improved by ${formatCurrency(improvement)} from Month 1 to Month ${monthHistory.length}.`,
                type: 'positive'
            });
        }
    }
    
    if (profile.balance > 100000) {
        insights.push({
            icon: '💰',
            text: `Your balance grew from ₹1,00,000 to ${formatCurrency(profile.balance)}. Compounding at work!`,
            type: 'positive'
        });
    }
    
    // Future Wallet rate insight
    const futureWalletRate = profile.futureWallet?.rate || 0.15;
    const ratePercent = Math.round(futureWalletRate * 100);
    const futureWalletBalance = profile.futureWallet?.balance || 0;
    if (futureWalletBalance > 0) {
        insights.push({
            icon: '🔐',
            text: `Your Future Self Wallet (${ratePercent}% rate) has protected ${formatCurrency(futureWalletBalance)}. Higher rates increase long-term stability, but consistency matters more than intensity.`,
            type: 'positive'
        });
    }
    
    // Temptation Controls insight
    const lockHistory = profile.temptationLocks?.history || [];
    if (lockHistory.length > 0) {
        const monthsWithinLimit = lockHistory.filter(h => h.stayedWithinLimit).length;
        const totalMonths = lockHistory.length;
        const successRate = Math.round((monthsWithinLimit / totalMonths) * 100);
        
        if (monthsWithinLimit === totalMonths) {
            insights.push({
                icon: '🛡️',
                text: `You stayed within your self-set spending limits ${monthsWithinLimit} out of ${totalMonths} month(s). Constraints chosen in advance are more effective than willpower.`,
                type: 'positive'
            });
        } else if (successRate >= 70) {
            insights.push({
                icon: '🛡️',
                text: `You stayed within your temptation limits ${monthsWithinLimit} out of ${totalMonths} months (${successRate}%). Pre-commitment is working!`,
                type: 'positive'
            });
        } else {
            insights.push({
                icon: '🛡️',
                text: `You stayed within limits ${monthsWithinLimit} of ${totalMonths} months. Consider adjusting caps to be more sustainable.`,
                type: 'neutral'
            });
        }
    } else if (profile.temptationLocks?.enabled) {
        insights.push({
            icon: '🛡️',
            text: `You've enabled Temptation Controls. These voluntary limits teach that discipline is designed, not forced.`,
            type: 'neutral'
        });
    }
    
    // Goal Wallets insight
    const goalWallets = profile.goalWallets || [];
    const activeGoals = goalWallets.filter(w => w.status === 'active');
    const completedGoals = goalWallets.filter(w => w.status === 'completed');
    const earlyWithdrawnGoals = goalWallets.filter(w => w.status === 'withdrawn_early');
    
    if (completedGoals.length > 0) {
        const totalCompleted = completedGoals.length;
        const totalGoals = goalWallets.length;
        insights.push({
            icon: '🎯',
            text: `You've completed ${totalCompleted} of ${totalGoals} goal wallet(s). Goal-linked saving increases follow-through by separating intention from impulse.`,
            type: 'positive'
        });
    } else if (activeGoals.length > 0) {
        const totalLocked = activeGoals.reduce((sum, w) => sum + w.currentAmount, 0);
        insights.push({
            icon: '🎯',
            text: `You have ${activeGoals.length} active goal wallet(s) with ${formatCurrency(totalLocked)} locked toward future goals. Naming money changes behavior.`,
            type: 'positive'
        });
    }
    
    if (earlyWithdrawnGoals.length > 0) {
        insights.push({
            icon: '💭',
            text: `${earlyWithdrawnGoals.length} goal(s) withdrawn early. Each early withdrawal is a learning opportunity about commitment.`,
            type: 'neutral'
        });
    }
    
    return insights;
}

function generateDecisions(profile, portfolio) {
    const decisions = [];
    const monthHistory = profile.budget?.monthHistory || [];
    const transactions = portfolio?.transactions || [];
    
    let bestMonth = null;
    let worstMonth = null;
    let maxSaved = -Infinity;
    let minSaved = Infinity;
    
    monthHistory.forEach(month => {
        if (month.totalSaved > maxSaved) {
            maxSaved = month.totalSaved;
            bestMonth = month;
        }
        if (month.totalSaved < minSaved) {
            minSaved = month.totalSaved;
            worstMonth = month;
        }
    });
    
    if (bestMonth) {
        decisions.push({
            label: 'Best Budget Decision',
            text: `Month ${bestMonth.month}: Saved ${formatCurrency(bestMonth.totalSaved)} with ${bestMonth.xpEarned} XP earned.`,
            type: 'positive'
        });
    }
    
    const sellTx = transactions.filter(tx => tx.type === 'sell');
    let bestTrade = null;
    let worstTrade = null;
    let maxGain = -Infinity;
    let maxLoss = Infinity;
    
    sellTx.forEach(tx => {
        if (tx.cash_change > maxGain) {
            maxGain = tx.cash_change;
            bestTrade = tx;
        }
        if (tx.cash_change < maxLoss) {
            maxLoss = tx.cash_change;
            worstTrade = tx;
        }
    });
    
    if (bestTrade && maxGain > 0) {
        decisions.push({
            label: 'Best Investment Sale',
            text: `Sold for ${formatCurrency(maxGain)} profit on ${bestTrade.date}.`,
            type: 'positive'
        });
    }
    
    const fdMature = transactions.filter(tx => tx.type === 'fd_mature');
    if (fdMature.length > 0) {
        const totalFdReturns = fdMature.reduce((sum, tx) => sum + tx.cash_change, 0);
        decisions.push({
            label: 'Fixed Deposit Returns',
            text: `Earned ${formatCurrency(totalFdReturns)} from ${fdMature.length} matured FD(s). Patient investing pays off!`,
            type: 'positive'
        });
    }
    
    if (worstMonth && worstMonth !== bestMonth) {
        decisions.push({
            label: 'Room for Improvement',
            text: `Month ${worstMonth.month} had the lowest savings (${formatCurrency(worstMonth.totalSaved)}). Review spending patterns.`,
            type: 'neutral'
        });
    }
    
    if (decisions.length === 0) {
        decisions.push({
            label: 'Getting Started',
            text: 'Complete more months to see your decision analysis.',
            type: 'neutral'
        });
    }
    
    return decisions;
}

function generateLearnings(profile, portfolio) {
    const learnings = [];
    const monthHistory = profile.budget?.monthHistory || [];
    const positions = portfolio?.positions || [];
    const savingsRate = calculateSavingsRate(profile);
    const diversification = calculateDiversification(portfolio);
    
    learnings.push({
        text: 'Importance of emergency savings — consistent savings build a financial safety net.',
        unlocked: savingsRate >= 10 || monthHistory.length >= 2,
        icon: savingsRate >= 10 || monthHistory.length >= 2 ? '✅' : '🔒'
    });
    
    learnings.push({
        text: 'Why diversification reduces risk — spreading investments minimizes single-point failures.',
        unlocked: diversification.sectors >= 2,
        icon: diversification.sectors >= 2 ? '✅' : '🔒'
    });
    
    const hasFD = positions.some(p => p.type === 'fd');
    const hasMutual = positions.some(p => p.type === 'mutual');
    learnings.push({
        text: 'How compounding rewards patience — time in market beats timing the market.',
        unlocked: hasFD || hasMutual || monthHistory.length >= 3,
        icon: (hasFD || hasMutual || monthHistory.length >= 3) ? '✅' : '🔒'
    });
    
    const hasLiquid = positions.some(p => p.type === 'stock' || p.type === 'etf');
    learnings.push({
        text: 'Trade-offs between liquidity and returns — FDs lock money but guarantee returns.',
        unlocked: hasFD && hasLiquid,
        icon: (hasFD && hasLiquid) ? '✅' : '🔒'
    });
    
    learnings.push({
        text: 'The 50/30/20 budget rule — balancing needs, wants, and savings for financial health.',
        unlocked: monthHistory.length >= 1,
        icon: monthHistory.length >= 1 ? '✅' : '🔒'
    });
    
    learnings.push({
        text: 'Market volatility is normal — long-term investing smooths out short-term fluctuations.',
        unlocked: portfolio?.investMonth >= 4,
        icon: portfolio?.investMonth >= 4 ? '✅' : '🔒'
    });
    
    return learnings;
}

function calculatePortfolioReturn(portfolio) {
    if (!portfolio || !portfolio.positions || portfolio.positions.length === 0) {
        return 0;
    }
    
    let currentValue = portfolio.cash;
    let totalInvested = 100000;
    
    portfolio.positions.forEach(pos => {
        if (pos.type === 'fd') {
            currentValue += pos.principal;
        } else {
            currentValue += pos.quantity * pos.current_price;
        }
    });
    
    const transactions = portfolio.transactions || [];
    transactions.forEach(tx => {
        if (tx.type === 'fd_mature') {
            totalInvested += tx.cash_change - tx.price;
        }
    });
    
    return ((currentValue - totalInvested) / totalInvested) * 100;
}

function renderProgressTimeline(profile) {
    const container = document.getElementById('progressTimeline');
    const monthHistory = profile.budget?.monthHistory || [];
    
    if (monthHistory.length === 0) {
        container.innerHTML = '<p class="empty-state">Your progress timeline will appear as you complete months</p>';
        return;
    }
    
    let html = '<div class="timeline-items">';
    monthHistory.forEach((month, i) => {
        const savingsPercent = ((month.savings / profile.income) * 100).toFixed(0);
        const trendClass = month.totalSaved > 0 ? 'positive' : month.totalSaved < 0 ? 'negative' : 'neutral';
        
        html += `
            <div class="timeline-item">
                <div class="timeline-month">Month ${month.month}</div>
                <div class="timeline-value">Saved: ${savingsPercent}%</div>
                <div class="timeline-rate ${trendClass}">${formatCurrency(month.totalSaved)}</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderLettersArchive(profile) {
    const container = document.getElementById('lettersContainer');
    if (!container) return;
    
    const letters = profile.timeTravelLetters || [];
    
    if (letters.length === 0) {
        container.innerHTML = `
            <div class="letters-empty">
                <p>No letters yet</p>
                <p style="font-size: 0.85rem; margin-top: 8px;">When you write a letter to your future self, it will appear here.</p>
            </div>
        `;
        return;
    }
    
    const delivered = letters.filter(l => l.delivered);
    const pending = letters.filter(l => !l.delivered);
    
    let html = `
        <div class="letters-stats">
            <div class="letters-stat">
                <div class="letters-stat-value">${letters.length}</div>
                <div class="letters-stat-label">Letters Written</div>
            </div>
            <div class="letters-stat">
                <div class="letters-stat-value">${delivered.length}</div>
                <div class="letters-stat-label">Delivered</div>
            </div>
            <div class="letters-stat">
                <div class="letters-stat-value">${pending.length}</div>
                <div class="letters-stat-label">Waiting</div>
            </div>
        </div>
        <div class="letters-list">
    `;
    
    letters.forEach(letter => {
        const status = letter.delivered ? 'delivered' : 'pending';
        const dateText = letter.delivered 
            ? `Delivered Month ${letter.deliveredAt}` 
            : `Arrives Month ${letter.deliverMonth}`;
        
        html += `
            <div class="letter-archive-item">
                <div class="lai-header">
                    <span class="lai-date">Written Month ${letter.writtenMonth} • ${dateText}</span>
                    <span class="lai-badge ${status}">${status}</span>
                </div>
                <p class="lai-message">"${letter.message}"</p>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderLessonsLearned(profile) {
    const container = document.getElementById('lessonsContainer');
    if (!container) return;
    
    const reflections = profile.reflectionLogs || [];
    
    if (reflections.length === 0) {
        container.innerHTML = `
            <div class="lessons-empty">
                <p>No reflections yet</p>
                <p style="font-size: 0.85rem; margin-top: 8px;">When outcomes differ from expectations, you'll see observations here — not judgments.</p>
            </div>
        `;
        return;
    }
    
    const contextCounts = {};
    reflections.forEach(r => {
        contextCounts[r.context] = (contextCounts[r.context] || 0) + 1;
    });
    
    const mostCommon = Object.entries(contextCounts).sort((a, b) => b[1] - a[1])[0];
    const mostCommonTheme = mostCommon ? mostCommon[0].replace('_', ' ') : 'general';
    
    let html = `
        <div class="lessons-stats">
            <div class="lessons-stat">
                <div class="lessons-stat-value">${reflections.length}</div>
                <div class="lessons-stat-label">Reflections</div>
            </div>
            <div class="lessons-stat">
                <div class="lessons-stat-value">${reflections.filter(r => r.userReflection).length}</div>
                <div class="lessons-stat-label">With Notes</div>
            </div>
            <div class="lessons-stat">
                <div class="lessons-stat-value">${mostCommonTheme}</div>
                <div class="lessons-stat-label">Common Theme</div>
            </div>
        </div>
        <div class="lessons-list">
    `;
    
    reflections.slice().reverse().forEach(reflection => {
        html += `
            <div class="lesson-item">
                <div class="lesson-header">
                    <span class="lesson-trigger">${reflection.triggerEvent}<span class="lesson-context-badge">${reflection.context}</span></span>
                    <span class="lesson-month">Month ${reflection.month}</span>
                </div>
                <p class="lesson-insight">${reflection.autoInsight}</p>
                ${reflection.userReflection ? `<p class="lesson-reflection">"${reflection.userReflection}"</p>` : ''}
            </div>
        `;
    });
    
    html += `
        </div>
        <div class="lessons-educational">
            <p>People who reflect improve outcomes faster than those who avoid review.</p>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderLifeEvents(profile) {
    const container = document.getElementById('lifeEventsContainer');
    if (!container) return;
    
    const events = profile.lifeEvents || [];
    
    if (events.length === 0) {
        container.innerHTML = `
            <div class="life-events-empty">
                <p>No life events yet</p>
                <p style="font-size: 0.85rem; margin-top: 8px;">Unexpected events happen naturally as months pass. You'll navigate them when they arrive.</p>
            </div>
        `;
        return;
    }
    
    const negativeCount = events.filter(e => e.type === 'negative').length;
    const positiveCount = events.filter(e => e.type === 'positive').length;
    
    let totalImpact = 0;
    events.forEach(e => {
        if (e.financialImpact?.cashChange) {
            totalImpact += e.financialImpact.cashChange;
        }
    });
    
    const hasBuffer = profile.balance > profile.income * 2;
    const recoveryQuality = hasBuffer ? 'Resilient' : events.length <= 2 ? 'Early Days' : 'Building';
    
    let html = `
        <div class="life-events-stats">
            <div class="le-stat">
                <div class="le-stat-value">${events.length}</div>
                <div class="le-stat-label">Events</div>
            </div>
            <div class="le-stat">
                <div class="le-stat-value">${negativeCount} / ${positiveCount}</div>
                <div class="le-stat-label">Challenges / Windfalls</div>
            </div>
            <div class="le-stat">
                <div class="le-stat-value">${recoveryQuality}</div>
                <div class="le-stat-label">Recovery</div>
            </div>
        </div>
        <div class="life-events-list">
    `;
    
    events.slice().reverse().forEach(event => {
        let impactText = '';
        if (event.financialImpact?.cashChange) {
            const sign = event.financialImpact.cashChange > 0 ? '+' : '';
            impactText = `${sign}₹${Math.abs(event.financialImpact.cashChange).toLocaleString('en-IN')}`;
        } else if (event.financialImpact?.marketEffect) {
            impactText = `${Math.round(event.financialImpact.marketEffect * 100)}% on investments`;
        } else if (event.financialImpact?.incomeChange) {
            impactText = `${Math.round(event.financialImpact.incomeChange * 100)}% income`;
        }
        
        const impactClass = event.type === 'positive' ? 'positive' : event.type === 'negative' ? 'negative' : '';
        
        html += `
            <div class="le-archive-item type-${event.type}">
                <div class="le-item-header">
                    <span class="le-item-title">${event.title}</span>
                    <span class="le-item-month">Month ${event.month}</span>
                </div>
                ${impactText ? `<div class="le-item-impact ${impactClass}">${impactText}</div>` : ''}
                <div class="le-item-takeaway">${event.takeaway}</div>
            </div>
        `;
    });
    
    html += `
        </div>
        <div class="life-events-insight">
            <p>${hasBuffer 
                ? 'You recovered faster in months where savings buffers existed.' 
                : 'Building savings buffers helps absorb life\'s unexpected shocks.'}</p>
        </div>
    `;
    
    container.innerHTML = html;
}

function updateUI(profile, portfolio) {
    const healthData = calculateHealthScore(profile, portfolio);
    
    document.getElementById('healthScore').textContent = healthData.total;
    const ringCircumference = 327;
    const offset = ringCircumference - (ringCircumference * healthData.total / 100);
    document.getElementById('scoreRing').style.strokeDashoffset = offset;
    
    const labelEl = document.getElementById('healthLabel');
    let label, labelClass;
    if (healthData.total >= 80) { label = 'Excellent'; labelClass = 'score-excellent'; }
    else if (healthData.total >= 60) { label = 'Good'; labelClass = 'score-good'; }
    else if (healthData.total >= 40) { label = 'Fair'; labelClass = 'score-fair'; }
    else { label = 'Needs Work'; labelClass = 'score-poor'; }
    
    labelEl.textContent = label;
    labelEl.className = `health-score-label ${labelClass}`;
    
    document.getElementById('savingsRateValue').textContent = `${healthData.components.savingsRate.value}%`;
    document.getElementById('savingsRateBar').style.width = `${healthData.components.savingsRate.score}%`;
    
    document.getElementById('budgetDisciplineValue').textContent = `${healthData.components.budgetDiscipline.value}%`;
    document.getElementById('budgetDisciplineBar').style.width = `${healthData.components.budgetDiscipline.score}%`;
    
    document.getElementById('diversificationValue').textContent = healthData.components.diversification.value;
    document.getElementById('diversificationBar').style.width = `${healthData.components.diversification.score}%`;
    
    document.getElementById('riskBalanceValue').textContent = healthData.components.riskBalance.value;
    document.getElementById('riskBalanceBar').style.width = `${healthData.components.riskBalance.score}%`;
    
    document.getElementById('consistencyValue').textContent = healthData.components.consistency.value;
    document.getElementById('consistencyBar').style.width = `${healthData.components.consistency.score}%`;
    
    document.getElementById('totalXp').textContent = profile.xp;
    document.getElementById('monthsPlayed').textContent = (profile.budget?.month || 1) - 1;
    document.getElementById('totalSavings').textContent = formatCurrency(profile.balance - 100000);
    
    const portfolioReturn = calculatePortfolioReturn(portfolio);
    document.getElementById('portfolioReturn').textContent = `${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn.toFixed(1)}%`;
    document.getElementById('portfolioReturn').style.color = portfolioReturn >= 0 ? 'var(--success)' : 'var(--error)';
    document.getElementById('returnIcon').textContent = portfolioReturn >= 0 ? '📈' : '📉';
    
    const insights = generateInsights(profile, portfolio);
    const insightsList = document.getElementById('insightsList');
    insightsList.innerHTML = insights.map(i => `
        <div class="insight-item ${i.type}">
            <span class="insight-icon">${i.icon}</span>
            <p>${i.text}</p>
        </div>
    `).join('');
    
    const decisions = generateDecisions(profile, portfolio);
    const decisionsList = document.getElementById('decisionsList');
    decisionsList.innerHTML = decisions.map(d => `
        <div class="decision-item ${d.type}">
            <div class="decision-label">${d.label}</div>
            <div class="decision-text">${d.text}</div>
        </div>
    `).join('');
    
    const learnings = generateLearnings(profile, portfolio);
    const learningsList = document.getElementById('learningsList');
    learningsList.innerHTML = learnings.map(l => `
        <div class="learning-item ${l.unlocked ? '' : 'locked'}">
            <span class="learning-status">${l.icon}</span>
            <span>${l.text}</span>
        </div>
    `).join('');
    
    renderProgressTimeline(profile);
    renderLettersArchive(profile);
    renderLessonsLearned(profile);
    renderLifeEvents(profile);
    
    document.getElementById('currentMonth').textContent = `Month ${profile.budget?.month || 1}`;
    document.getElementById('levelBadge').querySelector('span:last-child').textContent = `Level ${profile.level}`;
    
    const unlockedCount = learnings.filter(l => l.unlocked).length;
    document.getElementById('takeawayText').textContent = 
        `You've unlocked ${unlockedCount} of ${learnings.length} financial lessons by simulating ${(profile.budget?.month || 1) - 1} months of decisions. These insights typically take years to learn through real-world experience.`;
    
    if (profile.demoMode) {
        document.getElementById('demoBanner').classList.add('show');
        document.getElementById('demoControls').classList.add('show');
    }
}

async function loadDemoPreset() {
    const demoProfile = {
        user_id: `demo_${Date.now()}`,
        name: 'Demo User',
        income: 50000,
        life_stage: 'Young Professional',
        knowledge_level: 'Intermediate',
        focus_goal: 'Build Wealth',
        balance: 165000,
        xp: 275,
        level: 3,
        demoMode: true,
        budget: {
            month: 6,
            allocated: false,
            needs: 0,
            wants: 0,
            savings: 0,
            needsRemaining: 0,
            wantsRemaining: 0,
            savingsRemaining: 0,
            expensesPaid: [],
            monthHistory: [
                { month: 1, needs: 25000, wants: 15000, savings: 10000, totalSaved: 10000, xpEarned: 25 },
                { month: 2, needs: 25000, wants: 12000, savings: 13000, totalSaved: 13000, xpEarned: 30 },
                { month: 3, needs: 24000, wants: 14000, savings: 12000, totalSaved: 12000, xpEarned: 25 },
                { month: 4, needs: 25000, wants: 10000, savings: 15000, totalSaved: 15000, xpEarned: 35 },
                { month: 5, needs: 25000, wants: 11000, savings: 14000, totalSaved: 14000, xpEarned: 30 }
            ]
        },
        timeTravelLetters: [
            {
                id: 'demo_ttl_1',
                writtenMonth: 1,
                deliverMonth: 4,
                trigger: 'month_start',
                tone: 'encouraging',
                message: 'Remember why you started. Every small step counts. You are building something meaningful.',
                delivered: true,
                deliveredAt: 4
            },
            {
                id: 'demo_ttl_2',
                writtenMonth: 3,
                deliverMonth: 9,
                trigger: 'month_start',
                tone: 'proud',
                message: 'If you are reading this, you made it through 6 more months. I hope you kept saving. I believe in you.',
                delivered: false,
                deliveredAt: null
            }
        ],
        goalWallets: [
            {
                id: 'demo_gw_1',
                name: 'Emergency Fund',
                targetAmount: 50000,
                currentAmount: 35000,
                totalContributed: 30000,
                totalGrowth: 5000,
                monthlyContribution: 5000,
                investmentType: 'fd',
                lockInMonths: 12,
                startMonth: 1,
                maturityMonth: 13,
                status: 'active',
                penaltyApplied: false,
                history: []
            }
        ],
        reflectionLogs: [
            {
                id: 'demo_rfl_1',
                month: 3,
                context: 'budget',
                triggerEvent: 'Below savings target',
                observedOutcome: 'Savings rate was 8% this month, below the recommended 10%.',
                reflectionPrompt: 'What would you like to try differently next month?',
                userReflection: 'I spent more on dining out than planned. Next month I will set a stricter limit.',
                autoInsight: 'One high-expense category caused most of the overspend.',
                acknowledged: true
            }
        ],
        lifeEvents: [
            {
                id: 'demo_le_1',
                month: 2,
                type: 'negative',
                category: 'health',
                title: 'Unexpected Medical Expense',
                description: 'A sudden health issue required immediate attention and treatment.',
                financialImpact: { cashChange: -12000 },
                userDecision: null,
                takeaway: 'This is why emergency funds exist — not to avoid emergencies, but to survive them calmly.',
                resolved: true
            },
            {
                id: 'demo_le_2',
                month: 4,
                type: 'positive',
                category: 'income',
                title: 'Performance Bonus',
                description: 'Your hard work was recognized with a one-time bonus.',
                financialImpact: { cashChange: 8000 },
                userDecision: null,
                takeaway: 'Windfalls are opportunities. How you use them shapes your financial future.',
                resolved: true
            }
        ]
    };
    
    const demoPortfolio = {
        cash: 45000,
        positions: [
            { id: 'STK_ALPHA', type: 'stock', name: 'AlphaTech', quantity: 50, avg_price: 240, current_price: 285, buy_month: 2 },
            { id: 'MF_INDEX', type: 'mutual', name: 'Nifty Index Fund', quantity: 300, avg_price: 100, current_price: 112, buy_month: 1 },
            { id: 'ETF_BANK', type: 'etf', name: 'Bank ETF', quantity: 80, avg_price: 120, current_price: 128, buy_month: 3 },
            { id: 'FD_DEMO1', type: 'fd', name: 'FD 1Y @6%', quantity: 1, principal: 25000, rate: 0.06, tenure: 12, maturity_month: 14, current_price: 25000 }
        ],
        transactions: [
            { tx_id: 'tx_1', date: 'Month 1', type: 'buy', asset_id: 'MF_INDEX', asset_type: 'mutual', quantity: 300, price: 100, cash_change: -30000 },
            { tx_id: 'tx_2', date: 'Month 2', type: 'buy', asset_id: 'STK_ALPHA', asset_type: 'stock', quantity: 50, price: 240, cash_change: -12024 },
            { tx_id: 'tx_3', date: 'Month 3', type: 'buy', asset_id: 'ETF_BANK', asset_type: 'etf', quantity: 80, price: 120, cash_change: -9610 },
            { tx_id: 'tx_4', date: 'Month 3', type: 'fd_open', asset_id: 'FD_DEMO1', asset_type: 'fd', quantity: 1, price: 25000, cash_change: -25000 }
        ],
        market_scenario: 'bull',
        investMonth: 5,
        startMonth: 1,
        achievements: { firstInvestment: true, diversified: true, fdMatured: false, yearHeld: false }
    };
    
    const demoMarket = [
        { id: 'STK_ALPHA', type: 'stock', name: 'AlphaTech', sector: 'Technology', basePrice: 240, price: 285, volatility: 0.08, icon: '💻', description: 'High growth tech stock' },
        { id: 'STK_BETA', type: 'stock', name: 'BetaFinance', sector: 'Finance', basePrice: 180, price: 195, volatility: 0.06, icon: '🏦', description: 'Finance sector stock' },
        { id: 'MF_INDEX', type: 'mutual', name: 'Nifty Index Fund', sector: 'Diversified', basePrice: 100, price: 112, volatility: 0.03, icon: '📊', description: 'Index tracking fund' },
        { id: 'ETF_BANK', type: 'etf', name: 'Bank ETF', sector: 'Finance', basePrice: 120, price: 128, volatility: 0.04, icon: '🏛️', description: 'Banking sector ETF' }
    ];
    
    localStorage.setItem('finplay_profile', JSON.stringify(demoProfile));
    localStorage.setItem('finplay_portfolio', JSON.stringify(demoPortfolio));
    localStorage.setItem('finplay_market', JSON.stringify(demoMarket));
    
    if (window.SyncService) {
        await window.SyncService.saveToServer();
    }
    
    return { profile: demoProfile, portfolio: demoPortfolio };
}

async function resetDemo() {
    localStorage.removeItem('finplay_profile');
    localStorage.removeItem('finplay_portfolio');
    localStorage.removeItem('finplay_market');
    
    const data = await loadDemoPreset();
    updateUI(data.profile, data.portfolio);
}

async function initializePage() {
    if (window.SyncService) {
        await window.SyncService.initializeFromServer();
    }
    
    let profile = getProfile();
    let portfolio = getPortfolio();
    
    if (!profile) {
        window.location.href = '/';
        return;
    }
    
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('analyticsContent').style.display = 'block';
    
    updateUI(profile, portfolio);
    
    document.getElementById('resetDemoBtn').addEventListener('click', resetDemo);
}

document.addEventListener('DOMContentLoaded', initializePage);

window.loadDemoPreset = loadDemoPreset;
window.resetDemo = resetDemo;
