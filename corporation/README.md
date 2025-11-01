# Bitburner Corporation Manager

An automated corporation management script for Bitburner that handles all aspects of running a corporation from startup to late game.

## Features

- **Automatic Division Creation**: Starts with Agriculture industry
- **Smart City Expansion**: Expands to all 6 cities automatically
- **Employee Management**: Hires and assigns employees based on optimal ratios
- **Warehouse Management**: Purchases and upgrades warehouses automatically
- **Material Management**: Handles material purchasing and selling
- **Smart Supply**: Enables smart supply for automated material ordering
- **Office Expansion**: Grows offices from 3 to 30 employees per city
- **Investment Management**: Accepts investment rounds when funds are low
- **Upgrade Purchasing**: Automatically purchases corporation upgrades
- **RAM Optimized**: Split architecture minimizes memory footprint

## How to Use

### Requirements

You need ONE of the following to create a corporation:
- **$150 billion** for a self-funded corporation, OR
- **Source-File 3** (complete BitNode 3)

### Setup

1. **Upload the Scripts**: Copy both `corp-start.js` and `corp-manager.js` to your Bitburner home server in the `corporation/` folder

2. **Run the Starter Script**:
   ```
   run corporation/corp-start.js
   ```
   This will:
   - Check if you have a corporation or create one
   - Create initial Agriculture division if needed
   - Save configuration to `/tmp/corp-config.txt`
   - Automatically launch the main manager

3. **Let it Run**: The manager will handle all corporation operations automatically

**Note**: Always run `corp-start.js` first. It will automatically launch `corp-manager.js`.

## Strategy

### Phase 1: Agriculture Startup
- Creates Agriculture division in first city
- Hires initial 3 employees per office
- Purchases warehouses in all cities
- Begins producing and selling Plants and Food
- Expands to all 6 cities

### Phase 2: Growth
- Accepts investment rounds (up to round 4) when funds < $100B
- Expands office sizes from 3 → 30 employees
- Upgrades warehouse sizes from 300 → 3,800
- Purchases corporation upgrades when affordable

### Phase 3: Optimization
- Maintains optimal employee ratios:
  - Operations: 30%
  - Engineer: 25%
  - Business: 20%
  - Management: 10%
  - R&D: 10%
  - Training: 5%
- Continuously purchases upgrades
- Maximizes production and profit

## Configuration

You can modify these constants at the top of `corp-manager.js`:

```javascript
const UPDATE_INTERVAL = 10000;          // 10 seconds between updates
const INITIAL_OFFICE_SIZE = 3;          // Starting employees per office
const TARGET_OFFICE_SIZE = 30;          // Target employees per office
const INITIAL_WAREHOUSE_SIZE = 300;     // Starting warehouse size
const TARGET_WAREHOUSE_SIZE = 3800;     // Target warehouse size
const SMART_SUPPLY_ENABLED = true;      // Enable smart supply automation
```

### Employee Ratios

Adjust the `EMPLOYEE_RATIOS` object to change position assignments:

```javascript
const EMPLOYEE_RATIOS = {
    "Operations": 0.30,              // Production efficiency
    "Engineer": 0.25,                // Material quality
    "Business": 0.20,                // Sales performance
    "Management": 0.10,              // Overall effectiveness
    "Research & Development": 0.10,  // Research points
    "Training": 0.05                 // Employee skills
};
```

## Architecture

### corp-start.js (Starter)
- Checks for existing corporation or creates new one
- Sets up initial Agriculture division
- Gathers static configuration
- Launches the main manager

### corp-manager.js (Main Manager)
- Reads configuration from file
- Manages all divisions and cities
- Handles hiring, assignments, and expansion
- Purchases materials and sells products
- Accepts investments when needed
- Buys corporation upgrades

## Status Display

The script shows real-time information:
- Corporation funds, revenue, expenses, and profit
- Number of divisions and current state
- City expansion progress
- Employee counts per city
- Warehouse sizes and upgrades
- Investment status
- Upgrade purchases

## Material Management (Agriculture)

The script automatically uses bulk purchasing for efficiency:
- **Bulk Buys Materials**:
  - Water: 500 units
  - Energy: 500 units
  - Hardware: 125 units
  - AI Cores: 75 units
  - Real Estate: 27,000 units

- **Sells Products**:
  - Plants: MAX at market price
  - Food: MAX at market price

**Note**: Uses `bulkPurchase` for one-time efficient material buying rather than continuous purchasing.

## Investment Rounds

The script accepts investment offers when:
- Corporation funds < $100 billion
- Investment round 1-4 is available

This provides capital for rapid expansion while maintaining majority ownership.

## Upgrades

The script automatically purchases these upgrades when affordable:
- Smart Factories (production boost)
- Smart Storage (warehouse efficiency)
- DreamSense (advertising power)
- Wilson Analytics (sales boost)
- Nuoptimal Nootropic Injector Implants (employee stats)
- Speech Processor Implants (employee charisma)
- Neural Accelerators (employee efficiency)
- FocusWires (employee intelligence)
- ABC SalesBots (sales automation)
- Project Insight (market analysis)

**Safety**: Only purchases if funds > 100x upgrade cost (prevents overspending)

## Tips

- The script starts conservatively and expands as funds allow
- It won't spend all your money - keeps reserves for stability
- Smart Supply automates material ordering once unlocked
- Office and warehouse expansion scales with available funds
- Employee ratios are optimized for Agriculture industry
- Investment rounds provide quick capital for expansion
- The script runs continuously - let it manage everything

## Future Enhancements

Potential additions:
- Product development for industries that support it
- Expansion to multiple industry types
- Advanced pricing strategies
- Research management
- Export/import routes between cities
- Dynamic employee ratio adjustments

## Author

Created for automated Bitburner corporation management.
