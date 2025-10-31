# Bitburner Gang Manager

An automated gang management script for the game Bitburner that handles all aspects of gang operations.

## Features

- **Automatic Recruitment**: Recruits new gang members whenever available
- **Smart Training**: Trains new members in combat skills until they reach effective stat levels
- **Respect Farming**: Uses terrorism to rapidly gain respect for faster recruitment
- **Wanted Level Management**: Automatically assigns vigilante justice when wanted penalty exceeds 1%
- **Equipment Management**: Automatically purchases all available equipment for gang members
- **Optimized Warfare**: Only top 6 members fight in territory warfare, rest earn money trafficking arms
- **Territory Warfare**: Manages territory warfare with intelligent clash engagement (95% win threshold)
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

### Phase 1: Initial Training (Start → Stats 100)
- Recruits members as they become available
- Trains all members in combat skills
- Purchases equipment as money becomes available

### Phase 2: Respect Farming (Stats 100+ → 12 Members)
- Trained members commit terrorism to rapidly gain respect
- Higher respect allows faster recruitment of new members
- Continues equipment purchases
- Goal: Reach maximum 12 gang members quickly

### Phase 3: Advanced Training (12 Members, Stats 100-300)
- All 12 members continue combat training
- Prepares members for territory warfare
- Continues equipment upgrades

### Phase 4: Territory Warfare (Stats 300+ → 100% Territory)
- Top 6 members (by combat stats) engage in territory warfare to build power
- Remaining 6 members traffic illegal arms to earn money
- Territory clashes automatically enabled when win chance reaches 95%
- Clashes disabled if win chance drops below 95%
- Automatically manages wanted level with vigilante justice (if penalty drops below 99%)
- Ascends members when their bonuses would double
- Goal: Achieve 100% territory control

### Phase 5: Money Making (100% Territory)
- All members switch to trafficking illegal arms
- This task scales best with territory controlled
- Continues ascension management
- Maximizes income generation

## Configuration

You can modify these constants at the top of the script to adjust behavior:

```javascript
const ASCENSION_MULTIPLIER_THRESHOLD = 2.0;  // Ascend when new multiplier is 2x current
const TERRITORY_CLASH_WIN_THRESHOLD = 0.95;  // Enable clashes at 95% win chance
const WANTED_PENALTY_THRESHOLD = 0.99;       // Do vigilante work if wanted penalty drops below 99%
const WARFARE_MEMBERS_COUNT = 6;             // Number of members to assign to territory warfare
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
- Wanted penalty percentage (100% = no penalty, lower = worse; vigilante justice triggers below 99%)
- Member task assignments
- Equipment purchases
- Ascensions performed
- Territory warfare status and win chances

## Tips

- The script is designed to run continuously - don't stop it unless necessary
- It automatically manages money spending on equipment while keeping reserves
- Top 6 members (by combat stats) do territory warfare to build power for your gang
- The other 6 members earn money through arms trafficking during warfare phase
- Territory warfare assignment happens even when clashes are disabled - this builds your gang's power
- Wanted penalty is inverted: 100% = perfect, 99% = 1% penalty (vigilante justice triggers below 99%)
- Territory warfare clashes are only engaged when you have ≥95% win chance against all gangs
- Arms trafficking scales with territory controlled, maximizing income at 100%
- Ascension timing is optimized to maximize long-term stat growth (2x multiplier threshold)

## Author

Created for automated Bitburner gang management.
