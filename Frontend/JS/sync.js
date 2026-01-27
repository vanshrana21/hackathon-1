const SyncService = {
    async loadFromServer() {
        const profile = this.getLocalProfile();
        if (!profile || !profile.user_id) {
            return null;
        }

        try {
            const response = await fetch(`/sync/load/${profile.user_id}`);
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error('Failed to load from server');
            }

            const data = await response.json();
            
            if (data.profile) {
                localStorage.setItem('finplay_profile', JSON.stringify(data.profile));
            }
            if (data.portfolio) {
                localStorage.setItem('finplay_portfolio', JSON.stringify(data.portfolio));
            }
            if (data.market) {
                localStorage.setItem('finplay_market', JSON.stringify(data.market));
            }

            return data;
        } catch (error) {
            console.error('[SyncService] Load error:', error);
            return null;
        }
    },

    async saveToServer() {
        const profile = this.getLocalProfile();
        if (!profile || !profile.user_id) {
            console.warn('[SyncService] No user_id, skipping save');
            return false;
        }

        const portfolio = this.getLocalPortfolio();
        const market = this.getLocalMarket();

        const gameState = {
            profile: profile,
            portfolio: portfolio || null,
            market: market || null
        };

        try {
            const response = await fetch('/sync/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameState)
            });

            if (!response.ok) {
                throw new Error('Failed to save to server');
            }

            console.log('[SyncService] State saved to server');
            return true;
        } catch (error) {
            console.error('[SyncService] Save error:', error);
            return false;
        }
    },

    getLocalProfile() {
        try {
            const data = localStorage.getItem('finplay_profile');
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    getLocalPortfolio() {
        try {
            const data = localStorage.getItem('finplay_portfolio');
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    getLocalMarket() {
        try {
            const data = localStorage.getItem('finplay_market');
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    saveLocalProfile(profile) {
        localStorage.setItem('finplay_profile', JSON.stringify(profile));
        this.debouncedSave();
    },

    saveLocalPortfolio(portfolio) {
        localStorage.setItem('finplay_portfolio', JSON.stringify(portfolio));
        this.debouncedSave();
    },

    saveLocalMarket(market) {
        localStorage.setItem('finplay_market', JSON.stringify(market));
        this.debouncedSave();
    },

    _saveTimeout: null,
    debouncedSave() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        this._saveTimeout = setTimeout(() => {
            this.saveToServer();
        }, 1000);
    },

    async initializeFromServer() {
        const profile = this.getLocalProfile();
        if (profile && profile.user_id) {
            const serverData = await this.loadFromServer();
            return serverData !== null;
        }
        return false;
    }
};

window.SyncService = SyncService;
