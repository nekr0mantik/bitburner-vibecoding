# Bitburner Gang Manager

An automated gang management script for the game Bitburner that handles all aspects of gang operations.

## Features

- **Automatic Recruitment**: Recruits new gang members whenever available
- **Smart Training**: Trains new members in combat skills until they reach effective stat levels
- **Equipment Management**: Automatically purchases all available equipment for gang members
- **Territory Warfare**: Manages territory warfare with intelligent clash engagement
- **Ascension Management**: Ascends members when their bonuses would double (2x multiplier)
- **Optimized Money Making**: Switches to arms trafficking after 100% territory control

## How to Use

1. **Start a Gang**: Make sure you've already created a gang in Bitburner (requires specific faction membership)

2. **Upload the Script**: Copy `gang-manager.js` to your Bitburner home server

3. **Run the Script**:
   ```
   run gang-manager.js
   ```

4. **Let it Run**: The script will continuously manage your gang operations. You can minimize the window and let it work in the background.

## Strategy

### Phase 1: Training (Start → Stats ~300)
- Recruits members continuously
- Trains all members in combat skills
- Purchases equipment as money becomes available

### Phase 2: Territory Warfare (Stats 300+ → 100% Territory)
- Assigns trained members to territory warfare
- Enables clashes only when win chance is ≥95%
- Continues to recruit and equip new members
- Ascends members when their bonuses would double

### Phase 3: Money Making (100% Territory)
- All members switch to trafficking illegal arms
- This task scales best with territory controlled
- Continues ascension management
- Maximizes income generation

## Configuration

You can modify these constants at the top of the script to adjust behavior:

```javascript
const ASCENSION_MULTIPLIER_THRESHOLD = 2.0;  // Ascend when new multiplier is 2x current
const TERRITORY_CLASH_WIN_THRESHOLD = 0.95;  // Enable clashes at 95% win chance
const TRAINING_STATS_THRESHOLD = 100;        // Train until stats reach this level
const TERRITORY_WAR_STATS_THRESHOLD = 300;   // Switch to territory war after this
const UPDATE_INTERVAL = 10000;               // 10 seconds between updates
```

## Requirements

- Be in a gang (join Slum Snakes, Tetrads, The Syndicate, etc.)
- Have enough karma to create a gang (typically requires doing crimes)
- Run the script on your home server

## Status Display

The script shows real-time information:
- Current gang faction
- Number of members
- Territory percentage
- Respect and wanted level
- Member task assignments
- Equipment purchases
- Ascensions performed
- Territory warfare status and win chances

## Tips

- The script is designed to run continuously - don't stop it unless necessary
- It automatically manages money spending on equipment while keeping reserves
- Territory warfare is only engaged when you have a strong advantage
- Arms trafficking becomes available after 100% territory and provides the best income
- Ascension timing is optimized to maximize long-term stat growth

## Author

Created for automated Bitburner gang management.
