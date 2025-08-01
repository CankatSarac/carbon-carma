class CarbonKarmaTracker {
  constructor() {
    this.startTime = Date.now();
    this.carbonData = null;
    this.energyUsage = 0;
    this.timeSpent = 0;
    this.cpuUsage = 0;
    this.threshold = 5.0; // Default threshold in grams CO2
    this.updateInterval = null;
    this.performanceObserver = null;
    this.isTracking = false;
    
    this.init();
  }

  async init() {
    // Don't track on certain pages
    if (this.shouldSkipTracking()) {
      return;
    }

    try {
      // Get user settings
      const userData = await this.sendMessage({ type: 'GET_USER_DATA' });
      if (userData.success && userData.data.settings) {
        this.threshold = userData.data.settings.threshold;
        if (!userData.data.settings.trackingEnabled) {
          return;
        }
      }

      // Get carbon footprint for current page
      await this.loadCarbonData();
      
      // Start tracking if page is long enough or has significant content
      if (this.shouldShowTracker()) {
        this.createTracker();
        this.startTracking();
      }
    } catch (error) {
      console.error('Carbon Karma initialization failed:', error);
    }
  }

  shouldSkipTracking() {
    const url = window.location.href;
    const skipDomains = [
      'chrome-extension://',
      'chrome://',
      'about:',
      'moz-extension://',
      'file://'
    ];
    
    return skipDomains.some(domain => url.startsWith(domain));
  }

  shouldShowTracker() {
    // Show tracker on pages with substantial content
    const bodyHeight = document.body.scrollHeight;
    const viewportHeight = window.innerHeight;
    const hasScroll = bodyHeight > viewportHeight * 1.5;
    
    // Or pages with media content
    const hasMedia = document.querySelectorAll('video, audio, iframe').length > 0;
    
    // Or pages with many images
    const hasImages = document.querySelectorAll('img').length > 10;
    
    return hasScroll || hasMedia || hasImages;
  }

  async loadCarbonData() {
    try {
      const response = await this.sendMessage({
        type: 'GET_CARBON_FOOTPRINT',
        url: window.location.href
      });
      
      if (response.success) {
        this.carbonData = response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.warn('Failed to load carbon data:', error);
      // Use fallback data
      this.carbonData = {
        carbonPerView: 4.6,
        cleanerThan: 50,
        renewable: false,
        estimated: true
      };
    }
  }

  createTracker() {
    // Remove existing tracker if present
    const existing = document.getElementById('carbon-karma-counter');
    if (existing) {
      existing.remove();
    }

    const tracker = document.createElement('div');
    tracker.id = 'carbon-karma-counter';
    tracker.innerHTML = `
      <div class="carbon-stats">
        <div class="stat-item">
          <div class="stat-value" id="carbon-value">0.0g</div>
          <div class="stat-label">CO₂ emitted</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" id="time-value">0s</div>
          <div class="stat-label">Time on page</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" id="energy-value">0.0J</div>
          <div class="stat-label">Energy used</div>
        </div>
      </div>
      
      <div class="right-section">
        <div class="badge-section">
          <div class="badge" id="karma-badge">🌱</div>
          <button class="alternatives-btn" id="alternatives-btn" style="display: none;">
            Find alternatives
          </button>
        </div>
        <button class="close-counter" id="close-counter">×</button>
      </div>
    `;

    document.body.appendChild(tracker);
    
    // Add event listeners
    document.getElementById('close-counter').addEventListener('click', () => {
      this.hideTracker();
    });
    
    document.getElementById('alternatives-btn').addEventListener('click', () => {
      this.showAlternatives();
    });

    // Show tracker with animation
    setTimeout(() => {
      tracker.classList.add('visible');
    }, 1000);
  }

  startTracking() {
    this.isTracking = true;
    
    // Initialize performance monitoring
    this.initPerformanceTracking();
    
    // Update every second
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000);

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseTracking();
      } else {
        this.resumeTracking();
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.finalizeSession();
    });
  }

  initPerformanceTracking() {
    // Monitor CPU usage through performance entries
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // Estimate CPU usage from task duration
            if (entry.duration > 16) { // > 1 frame at 60fps
              this.cpuUsage += entry.duration;
            }
          }
        });
        
        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }
  }

  updateMetrics() {
    if (!this.isTracking) return;

    const now = Date.now();
    this.timeSpent = Math.floor((now - this.startTime) / 1000);
    
    // Calculate energy usage (simplified model)
    const baseEnergyPerSecond = 0.1; // Joules per second for display
    const cpuMultiplier = 1 + (this.cpuUsage / 10000); // Scale CPU impact
    this.energyUsage += baseEnergyPerSecond * cpuMultiplier;
    
    // Calculate total carbon footprint
    const baseCarbonFootprint = this.carbonData.carbonPerView;
    const timeBasedCarbon = (this.timeSpent / 60) * 0.5; // 0.5g per minute of browsing
    const energyBasedCarbon = this.energyUsage * 0.0005; // Convert energy to carbon
    
    const totalCarbon = baseCarbonFootprint + timeBasedCarbon + energyBasedCarbon;
    
    // Update UI
    this.updateUI(totalCarbon);
    
    // Check for badge changes
    this.updateBadgeStatus(totalCarbon);
    
    // Update stats every 10 seconds
    if (this.timeSpent % 10 === 0 && this.timeSpent > 0) {
      this.updateCurrentStats(totalCarbon);
    }
  }

  updateUI(totalCarbon) {
    const carbonValue = document.getElementById('carbon-value');
    const timeValue = document.getElementById('time-value');
    const energyValue = document.getElementById('energy-value');
    
    if (carbonValue) {
      carbonValue.textContent = `${totalCarbon.toFixed(1)}g`;
    }
    
    if (timeValue) {
      const minutes = Math.floor(this.timeSpent / 60);
      const seconds = this.timeSpent % 60;
      timeValue.textContent = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    }
    
    if (energyValue) {
      energyValue.textContent = `${this.energyUsage.toFixed(1)}J`;
    }
  }

  updateBadgeStatus(totalCarbon) {
    const tracker = document.getElementById('carbon-karma-counter');
    const badge = document.getElementById('karma-badge');
    const alternativesBtn = document.getElementById('alternatives-btn');
    
    if (!tracker || !badge) return;

    if (totalCarbon > this.threshold) {
      // High carbon usage
      tracker.classList.add('high-usage');
      badge.textContent = '⚠️';
      badge.classList.remove('earned');
      badge.classList.add('lost');
      
      if (alternativesBtn) {
        alternativesBtn.style.display = 'block';
      }
    } else {
      // Low carbon usage
      tracker.classList.remove('high-usage');
      badge.textContent = '🌱';
      badge.classList.remove('lost');
      badge.classList.add('earned');
      
      if (alternativesBtn) {
        alternativesBtn.style.display = 'none';
      }
    }
  }

  async updateCurrentStats(totalCarbon) {
    try {
      const sessionData = {
        carbonEmitted: totalCarbon,
        timeSpent: this.timeSpent,
        energyUsed: this.energyUsage,
        threshold: this.threshold,
        url: window.location.href,
        timestamp: Date.now(),
        isPartialUpdate: true // Flag to indicate this is a live update
      };

      await this.sendMessage({
        type: 'UPDATE_CURRENT_STATS',
        data: sessionData
      });
    } catch (error) {
      console.error('Failed to update current stats:', error);
    }
  }

  async showAlternatives() {
    try {
      const domain = window.location.hostname;
      const response = await this.sendMessage({
        type: 'FIND_ALTERNATIVES',
        domain: domain
      });
      
      if (response.success && response.data.length > 0) {
        this.displayAlternatives(response.data);
      } else {
        this.showNoAlternativesMessage();
      }
    } catch (error) {
      console.error('Failed to load alternatives:', error);
    }
  }

  displayAlternatives(alternatives) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 500px;
      max-height: 400px;
      overflow-y: auto;
    `;
    
    content.innerHTML = `
      <h3 style="margin-top: 0; color: #2d5a27;">🌱 Green Alternatives</h3>
      <p style="color: #666; margin-bottom: 20px;">Here are some eco-friendly alternatives to consider:</p>
      ${alternatives.map(alt => `
        <div style="margin-bottom: 15px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h4 style="margin: 0 0 5px 0;">
            <a href="${alt.url}" target="_blank" style="color: #2d5a27; text-decoration: none;">
              ${alt.name} →
            </a>
          </h4>
          <p style="margin: 0; color: #666; font-size: 14px;">${alt.description}</p>
        </div>
      `).join('')}
      <button id="close-alternatives" style="
        background: #2d5a27;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        float: right;
        margin-top: 10px;
      ">Close</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close modal events
    document.getElementById('close-alternatives').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  showNoAlternativesMessage() {
    alert('No green alternatives found for this site. Consider reducing time spent here or looking for similar eco-friendly websites!');
  }

  pauseTracking() {
    this.isTracking = false;
  }

  resumeTracking() {
    this.isTracking = true;
    this.startTime = Date.now() - (this.timeSpent * 1000); // Adjust start time
  }

  hideTracker() {
    const tracker = document.getElementById('carbon-karma-counter');
    if (tracker) {
      tracker.classList.remove('visible');
      setTimeout(() => {
        tracker.remove();
      }, 300);
    }
    this.stopTracking();
  }

  stopTracking() {
    this.isTracking = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  async finalizeSession() {
    if (!this.carbonData) return;

    const sessionData = {
      carbonEmitted: this.carbonData.carbonPerView + (this.timeSpent / 60) * 0.5 + this.energyUsage * 0.0005,
      timeSpent: this.timeSpent,
      energyUsed: this.energyUsage,
      threshold: this.threshold,
      url: window.location.href,
      timestamp: Date.now()
    };

    try {
      await this.sendMessage({
        type: 'UPDATE_BADGES',
        data: sessionData
      });
    } catch (error) {
      console.error('Failed to update badges:', error);
    }
  }

  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
  }
}

// Initialize tracker when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CarbonKarmaTracker();
  });
} else {
  new CarbonKarmaTracker();
}