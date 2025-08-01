# Carbon Karma Chrome Extension

A Chrome extension that tracks your website carbon footprint with live CO₂ counters and gamification features to encourage eco-friendly browsing habits.

## Features

### 🌱 Real-time Carbon Tracking
- Live CO₂ counter displayed at the bottom of web pages
- Tracks carbon emissions from page loads and browsing time
- Estimates energy usage based on CPU activity and time spent

### 🏆 Gamification System
- Earn leaf badges for low-carbon browsing sessions
- Lose badges for high-carbon "doom-scrolling"
- Achievement system with multiple unlockable badges
- Progress tracking and statistics

### 🌍 Green Alternatives
- Suggests eco-friendly alternatives when carbon footprint exceeds threshold
- Database of green alternatives for popular high-carbon websites
- One-click access to more sustainable options

### 📊 Analytics & Insights
- Detailed statistics on carbon usage, time spent, and sites visited
- Progress tracking with visual indicators
- Export your data for personal analysis

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The Carbon Karma extension should now appear in your toolbar

## API Integration

The extension integrates with:
- **WebsiteCarbon API**: For calculating page load carbon footprint
- **Carbon Interface API**: For regional electricity grid carbon intensity (requires API key)

### Setting up APIs (Optional)

For production use, you'll need API keys:
1. WebsiteCarbon API: Generally free for reasonable usage
2. Carbon Interface API: Requires registration for API key

## Usage

1. **Automatic Tracking**: The extension automatically tracks carbon emissions on websites with substantial content
2. **View Counter**: The carbon counter appears at the bottom of eligible pages
3. **Manage Badges**: Click the extension icon to view your badges and statistics
4. **Adjust Settings**: Customize carbon thresholds and tracking preferences in the popup

## File Structure

```
carbon-karma-extension/
├── manifest.json           # Extension configuration
├── popup.html             # Main popup interface
├── css/
│   ├── carbon-counter.css # Styles for injected counter
│   └── popup.css          # Popup interface styles
├── js/
│   ├── background.js      # Service worker with API integration
│   ├── content_script.js  # Page injection and tracking logic
│   └── popup.js          # Popup interface functionality
├── _locales/en/
│   └── messages.json     # Internationalization
└── icons/                # Extension icons (generate from create_icons.html)
```

## Development

To generate icons for the extension:
1. Open `create_icons.html` in a web browser
2. Download the generated PNG icons
3. Place them in the `icons/` directory

## Carbon Calculation

The extension estimates carbon footprint using:
- Base page load emissions (via WebsiteCarbon API)
- Time-based emissions (0.5g CO₂ per minute of browsing)
- Energy-based emissions (estimated from CPU usage)
- Regional carbon intensity data (when available)

## Privacy

- All data is stored locally using Chrome's storage API
- No personal data is transmitted to external servers
- API calls only include website URLs for carbon calculation
- Users can export or delete their data at any time

## Browser Compatibility

- Chrome (Manifest V3)
- Other Chromium-based browsers (Edge, Brave, etc.)

## License

MIT License - feel free to modify and distribute

## Contributing

Contributions welcome! Areas for improvement:
- More accurate carbon footprint calculations
- Additional green alternatives database
- Mobile browser support
- Integration with more carbon APIs

## Support

For issues or feature requests, please create an issue in the repository.

---

🌱 **Start your journey to more sustainable browsing with Carbon Karma!**