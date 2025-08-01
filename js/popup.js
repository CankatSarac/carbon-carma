class CarbonKarmaPopup {
  constructor() {
    this.userData = null;
    this.achievements = [
      {
        id: 'first-green',
        name: 'First Green Session',
        description: 'Complete your first low-carbon browsing session',
        icon: '🌿',
        condition: (data) => data.badges.greenSessions >= 1
      },
      {
        id: 'carbon-saver',
        name: 'Carbon Saver',
        description: 'Save 100g of CO₂ through green browsing',
        icon: '💚',
        condition: (data) => data.badges.carbonSaved >= 100
      },
      {
        id: 'eco-warrior',
        name: 'Eco Warrior',
        description: 'Maintain 50 leaf badges',
        icon: '🏆',
        condition: (data) => data.badges.leafBadges >= 50
      },
      {
        id: 'time-saver',
        name: 'Time Saver',
        description: 'Spend less than 5 minutes on high-carbon sites',
        icon: '⏰',
        condition: (data) => data.stats.totalTimeSpent > 3600 && data.badges.greenSessions / data.badges.totalSessions > 0.8
      },
      {
        id: 'explorer',
        name: 'Green Explorer',
        description: 'Visit 100 different websites',
        icon: '🗺️',
        condition: (data) => data.stats.sitesVisited >= 100
      }
    ];
    
    this.init();
  }

  async init() {
    await this.loadUserData();
    this.setupEventListeners();
    this.updateUI();
  }

  async loadUserData() {
    try {
      const response = await this.sendMessage({ type: 'GET_USER_DATA' });
      if (response.success) {
        this.userData = response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Provide fallback data
      this.userData = {
        badges: { leafBadges: 0, totalSessions: 0, greenSessions: 0, carbonSaved: 0 },
        settings: { threshold: 5.0, showCounter: true, trackingEnabled: true },
        stats: { totalCarbonEmitted: 0, totalTimeSpent: 0, sitesVisited: 0 }
      };
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Settings
    document.getElementById('tracking-enabled').addEventListener('change', (e) => {
      this.updateSetting('trackingEnabled', e.target.checked);
    });

    document.getElementById('show-counter').addEventListener('change', (e) => {
      this.updateSetting('showCounter', e.target.checked);
    });

    document.getElementById('carbon-threshold').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('threshold-value').textContent = `${value}g`;
      this.updateSetting('threshold', value);
    });

    // Action buttons
    document.getElementById('export-data').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('reset-data').addEventListener('click', () => {
      this.resetData();
    });

    // About links
    document.getElementById('privacy-policy').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://example.com/privacy-policy' });
    });

    document.getElementById('feedback').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'mailto:feedback@carbonkarma.com' });
    });
  }

  switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Update content for specific tabs
    if (tabName === 'badges') {
      this.updateBadgesTab();
    } else if (tabName === 'settings') {
      this.updateSettingsTab();
    }
  }

  updateUI() {
    this.updateDashboard();
    this.updateBadgeCount();
  }

  updateDashboard() {
    const { badges, stats, currentSession } = this.userData;

    // Include current session data if available
    let totalCarbon = stats.totalCarbonEmitted;
    let totalTime = stats.totalTimeSpent;
    
    if (currentSession && currentSession.timestamp) {
      // Add current session data (if it's recent - within last 30 seconds)
      const now = Date.now();
      if (now - currentSession.timestamp < 30000) {
        totalCarbon += currentSession.carbonEmitted;
        totalTime += currentSession.timeSpent;
      }
    }

    // Update stats cards
    document.getElementById('total-carbon').textContent = `${totalCarbon.toFixed(1)}g`;
    document.getElementById('total-time').textContent = this.formatTime(totalTime);
    document.getElementById('sites-visited').textContent = stats.sitesVisited.toString();
    document.getElementById('carbon-saved').textContent = `${badges.carbonSaved.toFixed(1)}g`;

    // Update progress
    const progressPercent = badges.totalSessions > 0 ? (badges.greenSessions / badges.totalSessions) * 100 : 0;
    document.getElementById('daily-progress').style.width = `${Math.min(progressPercent, 100)}%`;
    document.getElementById('green-sessions').textContent = badges.greenSessions.toString();

    // Update recent activity
    this.updateActivityList();
  }

  updateActivityList() {
    const activityList = document.getElementById('activity-list');
    const activities = this.generateRecentActivities();
    
    activityList.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <span class="activity-icon">${activity.icon}</span>
        <span class="activity-text">${activity.text}</span>
        <span class="activity-time">${activity.time}</span>
      </div>
    `).join('');
  }

  generateRecentActivities() {
    const { badges, stats } = this.userData;
    const activities = [];

    if (badges.leafBadges > 0) {
      activities.push({
        icon: '🌱',
        text: `Earned ${badges.leafBadges} leaf badge${badges.leafBadges > 1 ? 's' : ''}`,
        time: 'Today'
      });
    }

    if (stats.sitesVisited > 0) {
      activities.push({
        icon: '🌍',
        text: `Visited ${stats.sitesVisited} website${stats.sitesVisited > 1 ? 's' : ''}`,
        time: 'Today'
      });
    }

    if (badges.carbonSaved > 0) {
      activities.push({
        icon: '💚',
        text: `Saved ${badges.carbonSaved.toFixed(1)}g of CO₂`,
        time: 'Today'
      });
    }

    if (activities.length === 0) {
      activities.push({
        icon: '🌱',
        text: 'Welcome to Carbon Karma!',
        time: 'Just now'
      });
    }

    return activities.slice(0, 3);
  }

  updateBadgeCount() {
    document.getElementById('badge-count').textContent = this.userData.badges.leafBadges.toString();
  }

  updateBadgesTab() {
    // Update badge display
    document.getElementById('leaf-badge-count').textContent = this.userData.badges.leafBadges.toString();

    // Update achievements
    const achievementList = document.getElementById('achievement-list');
    achievementList.innerHTML = this.achievements.map(achievement => {
      const unlocked = achievement.condition(this.userData);
      return `
        <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}" data-achievement="${achievement.id}">
          <span class="achievement-icon">${achievement.icon}</span>
          <div class="achievement-info">
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-desc">${achievement.description}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  updateSettingsTab() {
    const { settings } = this.userData;
    
    document.getElementById('tracking-enabled').checked = settings.trackingEnabled;
    document.getElementById('show-counter').checked = settings.showCounter;
    document.getElementById('carbon-threshold').value = settings.threshold;
    document.getElementById('threshold-value').textContent = `${settings.threshold}g`;
  }

  async updateSetting(key, value) {
    try {
      this.userData.settings[key] = value;
      await chrome.storage.sync.set({ settings: this.userData.settings });
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  }

  exportData() {
    const dataToExport = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      data: this.userData
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `carbon-karma-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  async resetData() {
    if (!confirm('Are you sure you want to reset all your Carbon Karma data? This action cannot be undone.')) {
      return;
    }

    try {
      await chrome.storage.sync.clear();
      
      // Reinitialize with default data
      const defaultData = {
        badges: { leafBadges: 0, totalSessions: 0, greenSessions: 0, carbonSaved: 0 },
        settings: { threshold: 5.0, showCounter: true, trackingEnabled: true },
        stats: { totalCarbonEmitted: 0, totalTimeSpent: 0, sitesVisited: 0 }
      };

      await chrome.storage.sync.set(defaultData);
      this.userData = defaultData;
      this.updateUI();
      
      alert('Data reset successfully!');
    } catch (error) {
      console.error('Failed to reset data:', error);
      alert('Failed to reset data. Please try again.');
    }
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new CarbonKarmaPopup();
});