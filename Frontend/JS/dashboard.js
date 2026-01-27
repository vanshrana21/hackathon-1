console.log('[dashboard.js] Script loaded successfully');

function loadUserData() {
    const profileData = localStorage.getItem('finplay_profile');
    
    if (!profileData) {
        window.location.href = '/';
        return;
    }

    try {
        const profile = JSON.parse(profileData);
        displayUserData(profile);
    } catch (error) {
        console.error('Error parsing profile data:', error);
        localStorage.removeItem('finplay_profile');
        window.location.href = '/';
    }
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
    document.getElementById('currentXp').textContent = `${profile.xp} XP`;
    document.getElementById('xpFill').style.width = `${(profile.xp / 100) * 100}%`;
    document.getElementById('levelBadge').querySelector('span:last-child').textContent = `Level ${profile.level}`;

    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    loadUserData();

    document.getElementById('startLevelBtn').addEventListener('click', () => {
        alert('Level 1: Budgeting Basics coming soon! This feature will be available in the next phase.');
    });
});
