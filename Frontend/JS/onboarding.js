console.log('[onboarding.js] Script loaded successfully');

        const state = {
            currentStep: 1,
            name: '',
            knowledge_level: '',
            life_stage: '',
            goal: ''
        };

        const incomeMap = {
            'Student': 15000,
            'Just Started Working': 30000,
            'Young Professional': 50000,
            'Independent Adult': 75000
        };

        function updateProgressBar() {
            document.querySelectorAll('.progress-step').forEach((step, index) => {
                step.classList.remove('active', 'completed');
                if (index + 1 < state.currentStep) {
                    step.classList.add('completed');
                } else if (index + 1 === state.currentStep) {
                    step.classList.add('active');
                }
            });
            document.getElementById('currentStep').textContent = state.currentStep;
        }

        function showStep(stepNum) {
            document.querySelectorAll('.step').forEach(step => {
                step.classList.remove('active');
            });
            document.querySelector(`.step[data-step="${stepNum}"]`).classList.add('active');
            state.currentStep = stepNum;
            updateProgressBar();
        }

        function setupRadioGroup(groupId, stateKey, nextBtnId) {
            const group = document.getElementById(groupId);
            const nextBtn = document.getElementById(nextBtnId);
            
            group.querySelectorAll('.radio-option').forEach(option => {
                option.addEventListener('click', () => {
                    group.querySelectorAll('.radio-option').forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    option.querySelector('input').checked = true;
                    state[stateKey] = option.dataset.value;
                    if (nextBtn) nextBtn.disabled = false;
                    checkStep3();
                });
            });
        }

        function checkStep3() {
            const step3Next = document.getElementById('step3Next');
            if (state.life_stage && state.goal) {
                step3Next.disabled = false;
            }
        }

        function updateSummary() {
            document.getElementById('summaryName').textContent = state.name;
            document.getElementById('summaryKnowledge').textContent = state.knowledge_level;
            document.getElementById('summaryLifeStage').textContent = state.life_stage;
            document.getElementById('summaryGoal').textContent = state.goal;
            
            const income = incomeMap[state.life_stage] || 30000;
            document.getElementById('summaryIncome').textContent = `₹${income.toLocaleString('en-IN')}`;
        }

        async function submitOnboarding() {
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> Creating...';

            try {
                const response = await fetch('/users/onboard', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: state.name,
                        knowledge_level: state.knowledge_level,
                        life_stage: state.life_stage,
                        goal: state.goal
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to create user');
                }

                const user = await response.json();
                localStorage.setItem('user_id', user.id);
                window.location.href = '/dashboard';
            } catch (error) {
                console.error('Error:', error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Start My Journey <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
                alert('Something went wrong. Please try again.');
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const nameInput = document.getElementById('name');
            const step1Next = document.getElementById('step1Next');

            nameInput.addEventListener('input', () => {
                state.name = nameInput.value.trim();
                step1Next.disabled = state.name.length === 0;
            });

            step1Next.addEventListener('click', () => showStep(2));

            setupRadioGroup('knowledgeGroup', 'knowledge_level', 'step2Next');
            setupRadioGroup('lifeStageGroup', 'life_stage', null);
            setupRadioGroup('goalGroup', 'goal', null);

            document.getElementById('step2Back').addEventListener('click', () => showStep(1));
            document.getElementById('step2Next').addEventListener('click', () => showStep(3));

            document.getElementById('step3Back').addEventListener('click', () => showStep(2));
            document.getElementById('step3Next').addEventListener('click', () => {
                updateSummary();
                showStep(4);
            });

            document.getElementById('step4Back').addEventListener('click', () => showStep(3));
            document.getElementById('submitBtn').addEventListener('click', submitOnboarding);
        });
    