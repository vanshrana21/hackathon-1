console.log('[story.js] Script loaded successfully');

function getProfile() {
    const data = localStorage.getItem('finplay_profile');
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

function formatCurrency(amount) {
    return '₹' + Math.round(amount).toLocaleString('en-IN');
}

function generateFinancialStory(profile) {
    const story = {
        opening: generateOpening(profile),
        habits: generateHabitsSection(profile),
        pressure: generatePressureSection(profile),
        commitments: generateCommitmentsSection(profile),
        identity: generateIdentitySection(profile),
        closing: generateClosing(profile),
        summary: generateSummary(profile)
    };
    return story;
}

function generateOpening(profile) {
    const months = profile.budget?.month || 1;
    const initialRate = profile.futureWallet?.rate || 0.15;
    const hasEarlyMistakes = (profile.reflectionLogs?.length || 0) > 0;
    const firstMonthData = profile.budget?.monthHistory?.[0];
    
    let text = '';
    
    if (months <= 3) {
        text = `You began this journey with curiosity — willing to explore what financial planning could look like. `;
        text += `Even in the early days, you started making choices about how to balance today's needs with tomorrow's security.`;
    } else {
        text = `You started with uncertainty, curiosity, and a willingness to try something new. `;
        
        if (initialRate >= 0.20) {
            text += `From the beginning, you chose an ambitious savings commitment of <span class="story-highlight">${Math.round(initialRate * 100)}%</span> — a sign of serious intent.`;
        } else if (initialRate >= 0.15) {
            text += `You set a balanced savings rate of <span class="story-highlight">${Math.round(initialRate * 100)}%</span>, finding the middle ground between present comfort and future security.`;
        } else {
            text += `You started conservatively with a <span class="story-highlight">${Math.round(initialRate * 100)}%</span> savings rate, building confidence gradually.`;
        }
        
        if (hasEarlyMistakes) {
            text += `<p class="story-quote">Early stumbles are part of every learning journey. You had them too — and you kept going.</p>`;
        }
    }
    
    return text;
}

function generateHabitsSection(profile) {
    const futureWallet = profile.futureWallet || {};
    const temptationHistory = profile.temptationLocks?.history || [];
    const goalWallets = profile.goalWallets || [];
    const monthHistory = profile.budget?.monthHistory || [];
    
    let text = '';
    
    if (futureWallet.totalContributed > 0) {
        text += `Over time, you built a habit of paying yourself first. Your Future Self Wallet grew to <span class="story-highlight">${formatCurrency(futureWallet.balance)}</span>, `;
        text += `a tangible reminder that you learned to protect money before spending it. `;
    }
    
    const locksUsed = temptationHistory.filter(h => h.action === 'created').length;
    const locksResisted = temptationHistory.filter(h => h.action === 'expired_naturally').length;
    
    if (locksUsed > 0) {
        text += `<br><br>You created <span class="story-highlight">${locksUsed}</span> temptation lock${locksUsed > 1 ? 's' : ''} — moments where you chose to pause instead of act on impulse. `;
        
        if (locksResisted > 0) {
            text += `${locksResisted} of those temptations faded on their own, proving that waiting works.`;
        }
    }
    
    const activeGoals = goalWallets.filter(w => w.status === 'active').length;
    const completedGoals = goalWallets.filter(w => w.status === 'completed').length;
    
    if (activeGoals + completedGoals > 0) {
        text += `<br><br>You set <span class="story-highlight">${activeGoals + completedGoals}</span> dedicated goal${activeGoals + completedGoals > 1 ? 's' : ''}`;
        if (completedGoals > 0) {
            text += `, completing <span class="story-highlight">${completedGoals}</span> of them`;
        }
        text += `. Each goal represented a promise to your future self.`;
    }
    
    if (monthHistory.length >= 3) {
        const avgSavingsRate = monthHistory.reduce((sum, m) => sum + (m.savingsRate || 0), 0) / monthHistory.length;
        if (avgSavingsRate >= 15) {
            text += `<p class="story-quote">Your average savings rate of ${avgSavingsRate.toFixed(0)}% shows consistent discipline — the foundation of financial stability.</p>`;
        }
    }
    
    if (!text) {
        text = `Every journey begins with small steps. You're building the foundation for future habits, one decision at a time.`;
    }
    
    return text;
}

function generatePressureSection(profile) {
    const lifeEvents = profile.lifeEvents || [];
    const reflections = profile.reflectionLogs || [];
    const goalWallets = profile.goalWallets || [];
    
    const negativeEvents = lifeEvents.filter(e => e.type === 'negative');
    const hasWithdrawals = goalWallets.some(w => w.penaltyApplied);
    
    let text = '';
    
    if (negativeEvents.length > 0) {
        text += `Life tested you. `;
        
        if (negativeEvents.length === 1) {
            const event = negativeEvents[0];
            text += `When <span class="story-highlight">${event.title.toLowerCase()}</span> happened, you faced it and moved forward.`;
        } else {
            text += `You experienced <span class="story-highlight">${negativeEvents.length}</span> unexpected challenges — `;
            const eventNames = negativeEvents.slice(0, 3).map(e => e.title.toLowerCase()).join(', ');
            text += `${eventNames}. Each one could have derailed you, but you adapted instead.`;
        }
        
        const hasBufferDuringShocks = profile.balance > profile.income * 2;
        if (hasBufferDuringShocks) {
            text += `<p class="story-quote">Your savings buffer absorbed the shocks. That's not luck — that's preparation.</p>`;
        }
    }
    
    if (reflections.length > 0) {
        text += `<br><br>You took time to reflect on <span class="story-highlight">${reflections.length}</span> moment${reflections.length > 1 ? 's' : ''} when things didn't go as planned. `;
        text += `Instead of avoiding these experiences, you chose to learn from them.`;
        
        const withNotes = reflections.filter(r => r.userReflection).length;
        if (withNotes > 0) {
            text += ` You even wrote down your thoughts ${withNotes} time${withNotes > 1 ? 's' : ''}.`;
        }
    }
    
    if (hasWithdrawals) {
        text += `<br><br>There were moments of withdrawal from goals before their time. That's human. What matters is that you acknowledged it and kept going.`;
    }
    
    if (!text) {
        text = `So far, your journey has been steady. When challenges come — and they will — you'll have the foundation to handle them with calm.`;
    }
    
    return text;
}

function generateCommitmentsSection(profile) {
    const goalWallets = profile.goalWallets || [];
    const letters = profile.timeTravelLetters || [];
    const reflections = profile.reflectionLogs || [];
    
    const completedGoals = goalWallets.filter(w => w.status === 'completed');
    const deliveredLetters = letters.filter(l => l.delivered);
    const pendingLetters = letters.filter(l => !l.delivered);
    
    let text = '';
    
    if (completedGoals.length > 0) {
        text += `You completed <span class="story-highlight">${completedGoals.length}</span> financial goal${completedGoals.length > 1 ? 's' : ''}. `;
        
        const totalAchieved = completedGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
        text += `Together, they represent <span class="story-highlight">${formatCurrency(totalAchieved)}</span> in committed savings that you followed through on.`;
    }
    
    if (letters.length > 0) {
        text += `<br><br>You wrote <span class="story-highlight">${letters.length}</span> letter${letters.length > 1 ? 's' : ''} to your future self`;
        
        if (deliveredLetters.length > 0) {
            text += `, and <span class="story-highlight">${deliveredLetters.length}</span> ${deliveredLetters.length === 1 ? 'has' : 'have'} already arrived`;
        }
        text += `. `;
        
        if (pendingLetters.length > 0) {
            text += `${pendingLetters.length} ${pendingLetters.length === 1 ? 'is' : 'are'} still waiting in the future.`;
        }
        
        if (deliveredLetters.length > 0) {
            const recentLetter = deliveredLetters[deliveredLetters.length - 1];
            text += `<p class="story-quote">"${recentLetter.message}"</p>`;
        }
    }
    
    if (reflections.length > 0) {
        const acknowledgedCount = reflections.filter(r => r.acknowledged).length;
        text += `<br><br>You acknowledged <span class="story-highlight">${acknowledgedCount}</span> moment${acknowledgedCount > 1 ? 's' : ''} of learning. Reflection is commitment to growth.`;
    }
    
    if (!text) {
        text = `Your journey is still unfolding. Each month you continue builds toward the commitments you'll make to your future self.`;
    }
    
    return text;
}

function generateIdentitySection(profile) {
    const months = profile.budget?.month || 1;
    const avgSavingsRate = calculateAverageSavingsRate(profile);
    const lifeEvents = profile.lifeEvents || [];
    const goalWallets = profile.goalWallets || [];
    const futureWallet = profile.futureWallet || {};
    const reflections = profile.reflectionLogs || [];
    
    let identityType = 'Explorer';
    let identityDesc = '';
    
    const completedGoals = goalWallets.filter(w => w.status === 'completed').length;
    const negativeEventsHandled = lifeEvents.filter(e => e.type === 'negative' && e.resolved).length;
    const hasStrongSavings = avgSavingsRate >= 15;
    const hasReflected = reflections.length > 0;
    
    if (completedGoals >= 2 && hasStrongSavings) {
        identityType = 'The Planner';
        identityDesc = 'You set goals and follow through. Your approach is methodical, patient, and reliable.';
    } else if (negativeEventsHandled >= 2 && futureWallet.balance > 0) {
        identityType = 'The Stabilizer';
        identityDesc = 'You build buffers and weather storms. Uncertainty doesn\'t scare you — you prepare for it.';
    } else if (hasStrongSavings && months >= 6) {
        identityType = 'The Long-Term Thinker';
        identityDesc = 'You prioritize tomorrow without sacrificing today. Patience is your financial superpower.';
    } else if (hasReflected && negativeEventsHandled >= 1) {
        identityType = 'The Learner';
        identityDesc = 'You treat every outcome as feedback. Growth matters more than perfection.';
    } else if (months >= 3) {
        identityType = 'The Builder';
        identityDesc = 'You\'re laying the foundation. Each choice is a brick in your financial future.';
    } else {
        identityType = 'The Beginner';
        identityDesc = 'Every expert was once a beginner. Your willingness to start is the first sign of wisdom.';
    }
    
    return { type: identityType, description: identityDesc };
}

function generateClosing(profile) {
    const months = profile.budget?.month || 1;
    const hasReflections = (profile.reflectionLogs?.length || 0) > 0;
    const hasLifeEvents = (profile.lifeEvents?.length || 0) > 0;
    
    const closingOptions = [
        "The most important thing you learned wasn't how to grow money — it was how to stay calm while doing it.",
        "Wealth is not a number. It's the peace that comes from knowing you can handle what comes next.",
        "You didn't just simulate finances. You practiced being someone who plans, adapts, and persists.",
        "The habits you built here are portable. They go with you into real life.",
        "Financial health isn't about perfection. It's about showing up, month after month, and making thoughtful choices."
    ];
    
    if (hasReflections && hasLifeEvents) {
        return "You faced uncertainty, reflected on setbacks, and kept going. That's not simulation — that's character.";
    }
    
    if (months >= 12) {
        return "A year of choices, compressed into moments of learning. The patterns you built will echo forward.";
    }
    
    return closingOptions[Math.floor(Math.random() * closingOptions.length)];
}

function generateSummary(profile) {
    const months = profile.budget?.month || 1;
    const goalWallets = profile.goalWallets || [];
    const completedGoals = goalWallets.filter(w => w.status === 'completed').length;
    const avgSavingsRate = calculateAverageSavingsRate(profile);
    
    let healthTier = 'Starting';
    if (avgSavingsRate >= 20) healthTier = 'Excellent';
    else if (avgSavingsRate >= 15) healthTier = 'Good';
    else if (avgSavingsRate >= 10) healthTier = 'Fair';
    else if (avgSavingsRate >= 5) healthTier = 'Building';
    
    return {
        months: months,
        goalsCompleted: completedGoals,
        avgSavingsRate: Math.round(avgSavingsRate),
        healthTier: healthTier
    };
}

function calculateAverageSavingsRate(profile) {
    const history = profile.budget?.monthHistory || [];
    if (history.length === 0) return 0;
    
    const total = history.reduce((sum, m) => sum + (m.savingsRate || 0), 0);
    return total / history.length;
}

function renderStory(story) {
    const container = document.getElementById('storyContent');
    
    let html = `
        <div class="story-section">
            <h2 class="story-section-title">Where You Started</h2>
            <p class="story-text">${story.opening}</p>
        </div>
        
        <div class="story-section">
            <h2 class="story-section-title">Habits You Built</h2>
            <p class="story-text">${story.habits}</p>
        </div>
        
        <div class="story-section">
            <h2 class="story-section-title">How You Handled Pressure</h2>
            <p class="story-text">${story.pressure}</p>
        </div>
        
        <div class="story-section">
            <h2 class="story-section-title">Commitments You Kept</h2>
            <p class="story-text">${story.commitments}</p>
        </div>
        
        <div class="story-section">
            <div class="story-identity">
                <div class="identity-label">Who You Became Financially</div>
                <h3 class="identity-title">${story.identity.type}</h3>
                <p class="identity-desc">${story.identity.description}</p>
            </div>
        </div>
        
        <div class="story-section">
            <div class="story-summary">
                <div class="summary-item">
                    <div class="summary-value">${story.summary.months}</div>
                    <div class="summary-label">Months Played</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${story.summary.goalsCompleted}</div>
                    <div class="summary-label">Goals Completed</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${story.summary.avgSavingsRate}%</div>
                    <div class="summary-label">Avg. Savings Rate</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${story.summary.healthTier}</div>
                    <div class="summary-label">Financial Health</div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    document.getElementById('closingText').textContent = story.closing;
}

function initRestartFlow() {
    const showBtn = document.getElementById('showRestartBtn');
    const warning = document.getElementById('restartWarning');
    const cancelBtn = document.getElementById('cancelRestartBtn');
    const confirmBtn = document.getElementById('confirmRestartBtn');
    
    showBtn.addEventListener('click', () => {
        warning.classList.add('show');
    });
    
    cancelBtn.addEventListener('click', () => {
        warning.classList.remove('show');
    });
    
    confirmBtn.addEventListener('click', () => {
        localStorage.removeItem('finplay_profile');
        window.location.href = '/';
    });
}

function loadDemoStory() {
    const demoProfile = {
        name: 'Demo User',
        income: 50000,
        balance: 125000,
        xp: 850,
        level: 4,
        budget: {
            month: 6,
            monthHistory: [
                { totalSaved: 8500, savingsRate: 17 },
                { totalSaved: 7200, savingsRate: 14 },
                { totalSaved: 9000, savingsRate: 18 },
                { totalSaved: 6500, savingsRate: 13 },
                { totalSaved: 8800, savingsRate: 18 },
                { totalSaved: 9200, savingsRate: 18 }
            ]
        },
        futureWallet: {
            balance: 45000,
            totalContributed: 42000,
            rate: 0.15
        },
        temptationLocks: {
            history: [
                { action: 'created', amount: 3000 },
                { action: 'expired_naturally', amount: 3000 },
                { action: 'created', amount: 5000 }
            ]
        },
        goalWallets: [
            {
                name: 'Emergency Fund',
                status: 'completed',
                currentAmount: 50000,
                targetAmount: 50000
            },
            {
                name: 'Travel Fund',
                status: 'active',
                currentAmount: 25000,
                targetAmount: 100000
            }
        ],
        reflectionLogs: [
            {
                month: 3,
                context: 'budget',
                triggerEvent: 'Below savings target',
                userReflection: 'I spent more on dining out than planned.',
                autoInsight: 'One high-expense category caused most of the overspend.',
                acknowledged: true
            }
        ],
        lifeEvents: [
            {
                month: 2,
                type: 'negative',
                title: 'Unexpected Medical Expense',
                financialImpact: { cashChange: -12000 },
                resolved: true
            },
            {
                month: 5,
                type: 'positive',
                title: 'Performance Bonus',
                financialImpact: { cashChange: 8000 },
                resolved: true
            }
        ],
        timeTravelLetters: [
            {
                message: 'Remember why you started this journey.',
                writtenMonth: 1,
                deliverMonth: 6,
                delivered: true,
                deliveredAt: 6
            }
        ]
    };
    
    return demoProfile;
}

document.addEventListener('DOMContentLoaded', () => {
    let profile = getProfile();
    
    const urlParams = new URLSearchParams(window.location.search);
    const isDemo = urlParams.get('demo') === 'true' || profile?.isDemo;
    
    if (!profile || isDemo) {
        profile = loadDemoStory();
    }
    
    const story = generateFinancialStory(profile);
    renderStory(story);
    initRestartFlow();
});
