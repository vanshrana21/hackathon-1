console.log('[dashboard.js] Script loaded successfully');

const XP_PER_LEVEL = 100;
const LEVEL_DESCRIPTIONS = {
    1: { name: 'Budgeting Basics', desc: 'Learn to allocate your income wisely across needs, wants, and savings.' },
    2: { name: 'Savings Starter', desc: 'Build the habit of setting aside money for emergencies and goals.' },
    3: { name: 'Smart Spender', desc: 'Master the art of distinguishing between needs and wants.' },
    4: { name: 'Investment Intro', desc: 'Understand the basics of growing your money over time.' },
    5: { name: 'Financial Freedom', desc: 'Take control of your complete financial picture.' }
};

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
}

function calculateLevel(xp) {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function getXpForCurrentLevel(xp) {
    return xp % XP_PER_LEVEL;
}

function getLevelInfo(level) {
    return LEVEL_DESCRIPTIONS[level] || LEVEL_DESCRIPTIONS[5];
}

function addXp(amount) {
    const profile = getProfile();
    if (!profile) return null;
    
    const oldLevel = profile.level;
    profile.xp += amount;
    profile.level = calculateLevel(profile.xp);
    
    saveProfile(profile);
    
    if (profile.level > oldLevel) {
        showNotification(`Level Up! You're now Level ${profile.level}!`, 'success');
    } else {
        showNotification(`+${amount} XP earned!`, 'xp');
    }
    
    return profile;
}

function updateBalance(amount) {
    const profile = getProfile();
    if (!profile) return null;
    
    profile.balance += amount;
    saveProfile(profile);
    return profile;
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

function displayUserData(profile) {
    document.getElementById('userName').textContent = profile.name;
    document.getElementById('virtualBalance').textContent = `₹${profile.balance.toLocaleString('en-IN')}`;
    document.getElementById('monthlyIncome').textContent = `₹${profile.income.toLocaleString('en-IN')}`;
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
}

function allocateBudget() {
    const profile = getProfile();
    if (!profile) return;
    
    const amount = Math.floor(profile.income * 0.5);
    updateBalance(-amount);
    const updated = addXp(15);
    if (updated) displayUserData(updated);
}

function saveIncome() {
    const profile = getProfile();
    if (!profile) return;
    
    const saveAmount = Math.floor(profile.income * 0.2);
    updateBalance(saveAmount);
    const updated = addXp(20);
    if (updated) displayUserData(updated);
}

function skipExpense() {
    const profile = getProfile();
    if (!profile) return;
    
    const saved = Math.floor(profile.income * 0.1);
    updateBalance(saved);
    const updated = addXp(10);
    if (updated) displayUserData(updated);
}

function loadUserData() {
    const profile = getProfile();
    
    if (!profile) {
        window.location.href = '/';
        return;
    }

    if (!profile.level) {
        profile.level = calculateLevel(profile.xp);
        saveProfile(profile);
    }

    displayUserData(profile);
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

    document.getElementById('actionBudget').addEventListener('click', allocateBudget);
    document.getElementById('actionSave').addEventListener('click', saveIncome);
    document.getElementById('actionSkip').addEventListener('click', skipExpense);
});
