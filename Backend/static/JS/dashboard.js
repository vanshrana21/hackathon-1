
        async function loadUserData() {
            const userId = localStorage.getItem('user_id');
            
            if (!userId) {
                window.location.href = '/onboarding';
                return;
            }

            try {
                const response = await fetch(`/users/${userId}`);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        localStorage.removeItem('user_id');
                        window.location.href = '/onboarding';
                        return;
                    }
                    throw new Error('Failed to fetch user data');
                }

                const user = await response.json();
                displayUserData(user);
            } catch (error) {
                console.error('Error loading user data:', error);
                alert('Failed to load your profile. Please try again.');
            }
        }

        function displayUserData(user) {
            document.getElementById('userName').textContent = user.name;
            document.getElementById('virtualBalance').textContent = `₹${user.virtual_balance.toLocaleString('en-IN')}`;
            document.getElementById('monthlyIncome').textContent = `₹${user.monthly_income.toLocaleString('en-IN')}`;
            document.getElementById('xpValue').textContent = `${user.xp} XP`;
            document.getElementById('focusGoal').textContent = user.goal;
            document.getElementById('knowledgeLevel').textContent = user.knowledge_level;
            document.getElementById('lifeStage').textContent = user.life_stage;
            document.getElementById('primaryGoal').textContent = user.goal;
            document.getElementById('currentLevel').textContent = `Level ${user.current_level}`;
            document.getElementById('currentXp').textContent = `${user.xp} XP`;
            document.getElementById('xpFill').style.width = `${(user.xp / 100) * 100}%`;
            document.getElementById('levelBadge').querySelector('span:last-child').textContent = `Level ${user.current_level}`;

            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('dashboardContent').style.display = 'block';
        }

        document.addEventListener('DOMContentLoaded', () => {
            loadUserData();

            document.getElementById('startLevelBtn').addEventListener('click', () => {
                alert('Level 1: Budgeting Basics coming soon! This feature will be available in the next phase.');
            });
        });
    