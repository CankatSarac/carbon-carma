# Carbon Karma - Installation Guide

## Quick Setup

### Step 1: Generate Icons
1. Open `create_icons.html` in your web browser
2. Click the download buttons to save the 3 PNG icons
3. Move the downloaded PNG files to the `icons/` folder:
   - `icon16.png`
   - `icon48.png` 
   - `icon128.png`

### Step 2: Install Extension
1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `carbon-karma-extension` folder
6. The extension should now appear in your toolbar!

### Step 3: Test the Extension
1. Visit a website with substantial content (like a news article or blog post)
2. Look for the green carbon counter at the bottom of the page
3. Click the extension icon in your toolbar to view your badges and stats
4. Try the settings to customize your experience

## Troubleshooting

**Counter doesn't appear?**
- Make sure the page has enough content (long scroll or media)
- Check that tracking is enabled in extension settings
- Try refreshing the page

**Extension won't load?**
- Ensure all icon files are present in the `icons/` folder
- Check browser console for any error messages
- Verify you're using Chrome with developer mode enabled

**API errors?**
- The extension works offline with fallback carbon estimates
- For production use, consider getting API keys for more accurate data

## Customization

Edit `js/background.js` to:
- Add more green alternatives to the database
- Adjust carbon footprint calculation methods
- Modify regional carbon intensity values

Edit `css/carbon-counter.css` to:
- Change the appearance of the carbon counter
- Adjust colors and animations
- Modify responsive design breakpoints

## Next Steps

After installation, Carbon Karma will:
1. Start tracking your carbon footprint automatically
2. Show the counter on appropriate websites
3. Award badges for eco-friendly browsing
4. Suggest green alternatives when needed

Enjoy your journey to more sustainable web browsing! 🌱