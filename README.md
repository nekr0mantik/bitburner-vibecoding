# Bitburner Automation Scripts

A collection of automation scripts for the game Bitburner to help manage various game aspects efficiently.

## Available Scripts

### Gang Management

**Location**: `gang/gang-manager.js`

**Description**: Comprehensive automated gang management system that handles recruitment, training, equipment, territory warfare, and income optimization.

**Features**:
- Automatic member recruitment
- Smart training progression
- Respect farming via terrorism for faster recruitment
- Wanted level management with automatic vigilante justice (when penalty > 1%)
- Equipment purchasing
- Optimized warfare strategy (top 6 fight, others earn money)
- Territory warfare with intelligent clash engagement (95% win threshold)
- Ascension management (ascend at 2x multiplier threshold)
- Optimized money making (arms trafficking after 100% territory)
- RAM optimized (split architecture reduces memory footprint)

**Usage**:
```
run gang/gang-start.js
```
(This will automatically launch the optimized manager)

**Documentation**: [gang/README.md](gang/README.md)

---

## Project Structure

```
bitburner-vibecoding/
├── README.md                 # This file - main script index
└── gang/
    ├── gang-start.js         # Starter script (run this first)
    ├── gang-manager.js       # Main gang automation script
    └── README.md             # Detailed gang manager documentation
```

## Getting Started

1. Choose a script from the list above
2. Read its documentation for requirements and configuration
3. Upload the script to your Bitburner home server
4. Run the script using the command shown in its usage section

## Future Scripts

This repository will be expanded with additional automation scripts for:
- Hacking automation
- Server management
- Stock market trading
- Corporation management
- And more...

## Contributing

Each script is organized in its own folder with dedicated documentation. When adding new scripts, follow this structure:
- Create a folder for the script category
- Include the script file(s)
- Add a README.md with detailed documentation
- Update this main README with the new script entry

## Requirements

- Bitburner game (available on Steam or web browser)
- Basic understanding of the game mechanics for each script category
- Appropriate in-game progress to unlock features (e.g., gang access for gang scripts)
