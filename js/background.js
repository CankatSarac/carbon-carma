class CarbonKarmaBackground {
  constructor() {
    this.apiCache = new Map();
    this.carbonIntensityCache = new Map();
    this.initializeExtension();
  }

  initializeExtension() {
    chrome.runtime.onInstalled.addListener(() => {
      this.initializeStorage();
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  async initializeStorage() {
    const defaultData = {
      badges: {
        leafBadges: 0,
        totalSessions: 0,
        greenSessions: 0,
        carbonSaved: 0
      },
      settings: {
        threshold: 5.0, // grams CO2
        showCounter: true,
        trackingEnabled: true
      },
      stats: {
        totalCarbonEmitted: 0,
        totalTimeSpent: 0,
        sitesVisited: 0
      }
    };

    const stored = await chrome.storage.sync.get(['badges', 'settings', 'stats']);
    
    if (!stored.badges) {
      await chrome.storage.sync.set({ badges: defaultData.badges });
    }
    if (!stored.settings) {
      await chrome.storage.sync.set({ settings: defaultData.settings });
    }
    if (!stored.stats) {
      await chrome.storage.sync.set({ stats: defaultData.stats });
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.type) {
        case 'GET_CARBON_FOOTPRINT':
          const footprint = await this.getCarbonFootprint(request.url);
          sendResponse({ success: true, data: footprint });
          break;

        case 'GET_CARBON_INTENSITY':
          const intensity = await this.getCarbonIntensity(request.location);
          sendResponse({ success: true, data: intensity });
          break;

        case 'UPDATE_BADGES':
          await this.updateBadges(request.data);
          sendResponse({ success: true });
          break;

        case 'UPDATE_CURRENT_STATS':
          await this.updateCurrentStats(request.data);
          sendResponse({ success: true });
          break;

        case 'GET_USER_DATA':
          const userData = await this.getUserData();
          sendResponse({ success: true, data: userData });
          break;

        case 'FIND_ALTERNATIVES':
          const alternatives = await this.findGreenAlternatives(request.domain);
          sendResponse({ success: true, data: alternatives });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getCarbonFootprint(url) {
    const cacheKey = `carbon_${url}`;
    
    // Check cache first (valid for 1 hour)
    if (this.apiCache.has(cacheKey)) {
      const cached = this.apiCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 3600000) {
        return cached.data;
      }
    }

    try {
      // WebsiteCarbon API integration
      const response = await fetch(`https://api.websitecarbon.org/site?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Carbon Karma Extension v1.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      const result = {
        carbonPerView: data.c || this.estimateCarbonFootprint(url),
        cleanerThan: data.p || 50,
        renewable: data.green || false,
        bytes: data.bytes || 0,
        timestamp: Date.now()
      };

      // Cache the result
      this.apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return result;
    } catch (error) {
      console.warn('WebsiteCarbon API failed, using fallback:', error);
      return this.estimateCarbonFootprint(url);
    }
  }

  estimateCarbonFootprint(url) {
    // Fallback estimation based on domain patterns
    const domain = new URL(url).hostname;
    
    // Basic estimation: average website emits ~4.6g CO2 per page view
    let baseCO2 = 4.6;
    
    // Adjust based on known high-carbon domains
    const highCarbonDomains = ['youtube.com', 'netflix.com', 'amazon.com', 'facebook.com'];
    const lowCarbonDomains = ['wikipedia.org', 'stackoverflow.com', 'github.com'];
    
    if (highCarbonDomains.some(d => domain.includes(d))) {
      baseCO2 *= 2.5;
    } else if (lowCarbonDomains.some(d => domain.includes(d))) {
      baseCO2 *= 0.6;
    }

    return {
      carbonPerView: baseCO2,
      cleanerThan: 50,
      renewable: false,
      bytes: 2000000, // 2MB estimate
      timestamp: Date.now(),
      estimated: true
    };
  }

  async getCarbonIntensity(location = null) {
    const cacheKey = `intensity_${location || 'default'}`;
    
    // Check cache (valid for 6 hours)
    if (this.carbonIntensityCache.has(cacheKey)) {
      const cached = this.carbonIntensityCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 21600000) {
        return cached.data;
      }
    }

    try {
      // Get user's location for regional data (if available)
      const country = location || await this.getUserCountry();
      
      // Carbon Interface API - would need API key in production
      // For now, using regional averages
      const regionalIntensity = this.getRegionalCarbonIntensity(country);
      
      const result = {
        carbonIntensity: regionalIntensity,
        country: country,
        unit: 'gCO2/kWh',
        timestamp: Date.now()
      };

      this.carbonIntensityCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.warn('Carbon intensity lookup failed:', error);
      return {
        carbonIntensity: 475, // Global average
        country: 'Unknown',
        unit: 'gCO2/kWh',
        timestamp: Date.now(),
        estimated: true
      };
    }
  }

  getRegionalCarbonIntensity(country) {
    // Regional carbon intensity data (gCO2/kWh)
    const intensityData = {
      'US': 386,
      'GB': 233,
      'DE': 338,
      'FR': 57,
      'CA': 130,
      'AU': 634,
      'JP': 518,
      'CN': 681,
      'IN': 708,
      'BR': 82,
      'NO': 17,
      'IS': 0,
      'SE': 13
    };

    return intensityData[country] || 475; // Global average fallback
  }

  async getUserCountry() {
    try {
      // Try to get country from timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const countryMap = {
        'America/New_York': 'US',
        'America/Los_Angeles': 'US',
        'Europe/London': 'GB',
        'Europe/Berlin': 'DE',
        'Europe/Paris': 'FR',
        'Asia/Tokyo': 'JP',
        'Asia/Shanghai': 'CN',
        'Australia/Sydney': 'AU'
      };
      
      return countryMap[timezone] || 'US';
    } catch (error) {
      return 'US'; // Default fallback
    }
  }

  async updateBadges(sessionData) {
    const stored = await chrome.storage.sync.get(['badges', 'stats']);
    const badges = stored.badges || { leafBadges: 0, totalSessions: 0, greenSessions: 0, carbonSaved: 0 };
    const stats = stored.stats || { totalCarbonEmitted: 0, totalTimeSpent: 0, sitesVisited: 0 };

    // Update session stats
    badges.totalSessions++;
    stats.totalCarbonEmitted += sessionData.carbonEmitted;
    stats.totalTimeSpent += sessionData.timeSpent;
    stats.sitesVisited++;

    // Check if session qualifies for green badge
    if (sessionData.carbonEmitted < sessionData.threshold) {
      badges.greenSessions++;
      badges.leafBadges++;
      badges.carbonSaved += (sessionData.threshold - sessionData.carbonEmitted);
    } else {
      // Lose badges for high-carbon sessions
      badges.leafBadges = Math.max(0, badges.leafBadges - 1);
    }

    await chrome.storage.sync.set({ badges, stats });
    
    return { badges, stats };
  }

  async updateCurrentStats(sessionData) {
    // Only update current session stats, don't finalize the session
    const stored = await chrome.storage.sync.get(['stats', 'currentSession']);
    const stats = stored.stats || { totalCarbonEmitted: 0, totalTimeSpent: 0, sitesVisited: 0 };
    
    // Store current session data for live updates
    const currentSession = {
      carbonEmitted: sessionData.carbonEmitted,
      timeSpent: sessionData.timeSpent,
      energyUsed: sessionData.energyUsed,
      url: sessionData.url,
      timestamp: sessionData.timestamp
    };

    await chrome.storage.sync.set({ currentSession });
    return currentSession;
  }

  async getUserData() {
    const data = await chrome.storage.sync.get(['badges', 'settings', 'stats', 'currentSession']);
    return data;
  }

  async findGreenAlternatives(domain) {
    // Simple green alternatives database
    const alternatives = {
      'google.com': [
        { name: 'Ecosia', url: 'https://ecosia.org', description: 'Search engine that plants trees' },
        { name: 'DuckDuckGo', url: 'https://duckduckgo.com', description: 'Privacy-focused search' }
      ],
      'youtube.com': [
        { name: 'PeerTube', url: 'https://joinpeertube.org', description: 'Decentralized video platform' }
      ],
      'amazon.com': [
        { name: 'EcoCart', url: 'https://ecocart.io', description: 'Carbon-neutral shopping' }
      ],
      'netflix.com': [
        { name: 'Kanopy', url: 'https://kanopy.com', description: 'Library-based streaming' }
      ]
    };

    return alternatives[domain] || [];
  }
}

// Initialize the background service
new CarbonKarmaBackground();