/** @param {NS} ns */
export async function main(ns) {
    // Configuration
    const UPDATE_INTERVAL = 10000; // 10 seconds
    const INITIAL_OFFICE_SIZE = 3; // Start with 3 employees
    const TARGET_OFFICE_SIZE = 30; // Expand to 30 employees per office
    const INITIAL_WAREHOUSE_SIZE = 300; // Initial warehouse size
    const TARGET_WAREHOUSE_SIZE = 3800; // Target warehouse size

    // Employee assignment ratios for Agriculture
    const EMPLOYEE_RATIOS = {
        "Operations": 0.30,
        "Engineer": 0.25,
        "Business": 0.20,
        "Management": 0.10,
        "Research & Development": 0.10,
        "Training": 0.05
    };

    ns.disableLog("ALL");
    ns.clearLog();
    ns.tail();

    // Load configuration
    const configPath = "/tmp/corp-config.txt";
    if (!ns.fileExists(configPath)) {
        ns.print("ERROR: Configuration file not found!");
        ns.print("Please run corporation/corp-start.js first.");
        return;
    }

    const configData = ns.read(configPath);
    const config = JSON.parse(configData);

    ns.print("=== Corporation Manager Started ===");
    ns.print(`Corporation: ${config.corpName}`);

    while (true) {
        try {
            const corp = ns.corporation.getCorporation();

            ns.clearLog();
            ns.print("=== Corporation Status ===");
            ns.print(`Name: ${corp.name}`);
            ns.print(`Funds: $${ns.formatNumber(corp.funds)}`);
            ns.print(`Revenue: $${ns.formatNumber(corp.revenue)}/s`);
            ns.print(`Expenses: $${ns.formatNumber(corp.expenses)}/s`);
            ns.print(`Profit: $${ns.formatNumber(corp.revenue - corp.expenses)}/s`);
            ns.print(`Divisions: ${(corp.divisions || []).length}`);
            ns.print(`State: ${corp.state}`);
            ns.print("");

            // FIRST PRIORITY: Unlock Smart Supply before doing anything else
            await unlockSmartSupply(ns, corp);

            // Only manage divisions if Smart Supply is unlocked
            const hasSmartSupply = ns.corporation.hasUnlock("Smart Supply");
            if (hasSmartSupply) {
                // Manage each division
                for (const divisionName of (corp.divisions || [])) {
                    await manageDivision(ns, divisionName, config, corp);
                }

                // Try to accept investment if needed
                await manageInvestment(ns, corp);

                // Purchase other upgrades
                await unlockOtherUpgrades(ns, corp);
                await purchaseUpgrades(ns, corp);
            } else {
                ns.print("");
                ns.print("⚠️  WAITING FOR SMART SUPPLY UNLOCK");
                ns.print("   Smart Supply is required before operations can begin.");
                const cost = ns.corporation.getUnlockCost("Smart Supply");
                ns.print(`   Cost: $${ns.formatNumber(cost)}`);
                ns.print(`   Current funds: $${ns.formatNumber(corp.funds)}`);
            }

        } catch (error) {
            ns.print(`ERROR: ${error}`);
        }

        await ns.sleep(UPDATE_INTERVAL);
    }

    /**
     * Manage a single division
     */
    async function manageDivision(ns, divisionName, config, corp) {
        const division = ns.corporation.getDivision(divisionName);

        ns.print(`=== ${divisionName} Division ===`);
        ns.print(`Type: ${division.type}`);
        ns.print(`Cities: ${(division.cities || []).length}`);
        ns.print("");

        // Expand to all cities if not already
        await expandToAllCities(ns, divisionName, config.cities);

        // Manage each city
        for (const city of (division.cities || [])) {
            await manageCity(ns, divisionName, city, corp);
        }
    }

    /**
     * Expand division to all cities
     */
    async function expandToAllCities(ns, divisionName, cities) {
        const division = ns.corporation.getDivision(divisionName);
        const divisionCities = division.cities || [];

        for (const city of cities) {
            if (!divisionCities.includes(city)) {
                try {
                    ns.corporation.expandCity(divisionName, city);
                    ns.print(`✓ Expanded ${divisionName} to ${city}`);
                } catch (e) {
                    // Can't afford yet
                }
            }
        }
    }

    /**
     * Manage a city office
     */
    async function manageCity(ns, divisionName, city, corp) {
        const office = ns.corporation.getOffice(divisionName, city);

        // Expand office size if needed and affordable
        if (office.size < TARGET_OFFICE_SIZE) {
            try {
                const upgradeCost = ns.corporation.getOfficeSizeUpgradeCost(divisionName, city, 3);
                if (corp.funds > upgradeCost * 10) { // Only if we have 10x the cost
                    ns.corporation.upgradeOfficeSize(divisionName, city, 3);
                    ns.print(`✓ Expanded office in ${city} by 3`);
                }
            } catch (e) {
                // Can't upgrade
            }
        }

        // Hire employees to fill all positions
        let currentEmployees = office.employees || [];
        while (currentEmployees.length < office.size) {
            try {
                const employee = ns.corporation.hireEmployee(divisionName, city);
                if (employee) {
                    ns.print(`✓ Hired employee in ${city}`);
                    // Refresh office data
                    const updatedOffice = ns.corporation.getOffice(divisionName, city);
                    currentEmployees = updatedOffice.employees || [];
                } else {
                    break;
                }
            } catch (e) {
                break;
            }
        }

        // Assign employees based on ratios
        await assignEmployees(ns, divisionName, city, office);

        // Manage warehouse
        await manageWarehouse(ns, divisionName, city, corp);
    }

    /**
     * Assign employees to positions based on ratios
     */
    async function assignEmployees(ns, divisionName, city, office) {
        const employees = office.employees || [];
        const totalEmployees = employees.length;
        if (totalEmployees === 0) return;

        // Calculate target counts for each position
        const assignments = {};
        let assigned = 0;

        for (const [position, ratio] of Object.entries(EMPLOYEE_RATIOS)) {
            const count = Math.floor(totalEmployees * ratio);
            assignments[position] = count;
            assigned += count;
        }

        // Put remaining employees in Operations
        assignments["Operations"] += (totalEmployees - assigned);

        // Set employee assignments
        try {
            for (const [position, count] of Object.entries(assignments)) {
                if (count > 0) {
                    await ns.corporation.setAutoJobAssignment(divisionName, city, position, count);
                }
            }
        } catch (e) {
            // Assignment failed
        }
    }

    /**
     * Manage warehouse for a city
     */
    async function manageWarehouse(ns, divisionName, city, corp) {
        // Check if warehouse exists, if not, purchase it
        let hasWarehouse = true;
        try {
            ns.corporation.getWarehouse(divisionName, city);
        } catch (e) {
            hasWarehouse = false;
        }

        if (!hasWarehouse) {
            try {
                ns.corporation.purchaseWarehouse(divisionName, city);
                ns.print(`✓ Purchased warehouse in ${city}`);
                // Set initial size
                ns.corporation.upgradeWarehouse(divisionName, city, INITIAL_WAREHOUSE_SIZE);
            } catch (e) {
                // Can't afford warehouse yet
                return;
            }
        }

        const warehouse = ns.corporation.getWarehouse(divisionName, city);
        const division = ns.corporation.getDivision(divisionName);

        // Calculate warehouse usage
        const warehouseUsed = warehouse.sizeUsed || 0;
        const warehouseSize = warehouse.size || 0;
        const usagePercent = warehouseSize > 0 ? (warehouseUsed / warehouseSize) * 100 : 0;

        // Log warehouse status for Agriculture
        if (division.type === "Agriculture") {
            ns.print(`  ${city} Warehouse: ${ns.formatNumber(warehouseUsed)}/${ns.formatNumber(warehouseSize)} (${usagePercent.toFixed(1)}%)`);
        }

        // Only upgrade warehouse if it's getting full (>80% capacity)
        if (usagePercent > 80 && warehouse.size < TARGET_WAREHOUSE_SIZE) {
            try {
                const upgradeLevels = Math.min(10, Math.floor((TARGET_WAREHOUSE_SIZE - warehouse.size) / 100));
                if (upgradeLevels > 0 && corp.funds > 1e9) {
                    ns.corporation.upgradeWarehouse(divisionName, city, upgradeLevels);
                    ns.print(`  ${city}: ✓ Upgraded warehouse by ${upgradeLevels} levels (was ${usagePercent.toFixed(1)}% full)`);
                }
            } catch (e) {
                // Can't upgrade
            }
        }

        // Manage materials for Agriculture (Smart Supply must be unlocked to reach here)
        if (division.type === "Agriculture") {
            // Enable Smart Supply for automatic material management
            try {
                ns.corporation.setSmartSupply(divisionName, city, true);
                ns.corporation.setSmartSupplyUseLeftovers(divisionName, city, true);
            } catch (e) {
                // Smart Supply might already be enabled
            }

            // Buy boost materials to improve production (Hardware:Robots:AI Cores:Real Estate = 1:1:1:5 ratio)
            await buyBoostMaterials(ns, divisionName, city, corp, warehouse);

            // Set up selling for output materials
            try {
                ns.corporation.sellMaterial(divisionName, city, "Plants", "MAX", "MP");
                ns.corporation.sellMaterial(divisionName, city, "Food", "MAX", "MP");
            } catch (e) {
                // Selling setup failed
            }
        }
    }

    /**
     * Buy boost materials to improve production
     * Ratio: Hardware:Robots:AI Cores:Real Estate = 1:1:1:5
     */
    async function buyBoostMaterials(ns, divisionName, city, corp, warehouse) {
        try {
            // Get current material quantities
            const hardware = ns.corporation.getMaterial(divisionName, city, "Hardware");
            const robots = ns.corporation.getMaterial(divisionName, city, "Robots");
            const aiCores = ns.corporation.getMaterial(divisionName, city, "AI Cores");
            const realEstate = ns.corporation.getMaterial(divisionName, city, "Real Estate");

            // Calculate material sizes (approximate)
            const HARDWARE_SIZE = 0.06;
            const ROBOTS_SIZE = 0.5;
            const AI_CORES_SIZE = 0.1;
            const REAL_ESTATE_SIZE = 0.005;

            // Determine the target amount based on the lowest ratio component
            // Ratio is 1:1:1:5 for Hardware:Robots:AI:RealEstate
            const currentRatios = {
                hardware: hardware.qty,
                robots: robots.qty,
                aiCores: aiCores.qty,
                realEstate: realEstate.qty / 5  // Divide by 5 because we want 5x more
            };

            // Find the minimum to determine what to boost
            const minRatio = Math.min(currentRatios.hardware, currentRatios.robots, currentRatios.aiCores, currentRatios.realEstate);

            // Calculate how much we need to buy to balance the ratios
            const toBuy = {
                hardware: Math.max(0, minRatio + 10 - hardware.qty),
                robots: Math.max(0, minRatio + 10 - robots.qty),
                aiCores: Math.max(0, minRatio + 10 - aiCores.qty),
                realEstate: Math.max(0, (minRatio + 10) * 5 - realEstate.qty)
            };

            // Calculate space needed
            const spaceNeeded =
                toBuy.hardware * HARDWARE_SIZE +
                toBuy.robots * ROBOTS_SIZE +
                toBuy.aiCores * AI_CORES_SIZE +
                toBuy.realEstate * REAL_ESTATE_SIZE;

            // Calculate available space (keep 20% buffer for production)
            const availableSpace = (warehouse.size - warehouse.sizeUsed) * 0.8;

            // Reserve funds for potential warehouse upgrade
            const warehouseUpgradeCost = warehouse.size < TARGET_WAREHOUSE_SIZE ? 1e9 : 0;
            const availableFunds = corp.funds - warehouseUpgradeCost;

            // Only buy if we have space and funds
            if (spaceNeeded < availableSpace && availableFunds > 1e8) {
                // Calculate cost for materials
                const hardwareCost = ns.corporation.getMaterialData("Hardware").baseCost * toBuy.hardware;
                const robotsCost = ns.corporation.getMaterialData("Robots").baseCost * toBuy.robots;
                const aiCoresCost = ns.corporation.getMaterialData("AI Cores").baseCost * toBuy.aiCores;
                const realEstateCost = ns.corporation.getMaterialData("Real Estate").baseCost * toBuy.realEstate;
                const totalCost = hardwareCost + robotsCost + aiCoresCost + realEstateCost;

                if (availableFunds > totalCost * 2) { // Only buy if we have 2x the cost
                    // Buy the materials
                    if (toBuy.hardware > 0) {
                        ns.corporation.buyMaterial(divisionName, city, "Hardware", toBuy.hardware / 10);
                    }
                    if (toBuy.robots > 0) {
                        ns.corporation.buyMaterial(divisionName, city, "Robots", toBuy.robots / 10);
                    }
                    if (toBuy.aiCores > 0) {
                        ns.corporation.buyMaterial(divisionName, city, "AI Cores", toBuy.aiCores / 10);
                    }
                    if (toBuy.realEstate > 0) {
                        ns.corporation.buyMaterial(divisionName, city, "Real Estate", toBuy.realEstate / 10);
                    }
                }
            }
        } catch (e) {
            // Material buying failed
        }
    }

    /**
     * Manage investment rounds
     */
    async function manageInvestment(ns, corp) {
        // Check if we can get investment
        const investmentOffer = ns.corporation.getInvestmentOffer();

        if (investmentOffer.round > 0 && investmentOffer.round <= 4) {
            // Accept if we're low on funds
            if (corp.funds < 1e11) { // Less than 100B
                try {
                    ns.corporation.acceptInvestmentOffer();
                    ns.print(`✓ Accepted investment round ${investmentOffer.round}`);
                    ns.print(`  Funds received: $${ns.formatNumber(investmentOffer.funds)}`);
                    ns.print(`  Shares sold: ${investmentOffer.shares}`);
                } catch (e) {
                    // Can't accept yet
                }
            }
        }
    }

    /**
     * Unlock Smart Supply - HIGHEST PRIORITY
     */
    async function unlockSmartSupply(ns, corp) {
        const upgradeName = "Smart Supply";
        try {
            const hasUnlock = ns.corporation.hasUnlock(upgradeName);
            if (!hasUnlock) {
                const cost = ns.corporation.getUnlockCost(upgradeName);
                if (corp.funds >= cost) {
                    ns.corporation.purchaseUnlock(upgradeName);
                    ns.print(`✓✓✓ UNLOCKED ${upgradeName} (Cost: $${ns.formatNumber(cost)}) ✓✓✓`);
                    ns.print("");
                }
            }
        } catch (e) {
            ns.print(`ERROR unlocking Smart Supply: ${e}`);
        }
    }

    /**
     * Unlock other useful one-time upgrades
     */
    async function unlockOtherUpgrades(ns, corp) {
        // Other useful unlocks
        const otherUnlocks = [
            "Warehouse API",     // Allows warehouse management
            "Office API",        // Allows office management
            "Export"            // Allows exporting materials between divisions
        ];

        for (const unlockName of otherUnlocks) {
            try {
                const hasUnlock = ns.corporation.hasUnlock(unlockName);
                if (!hasUnlock) {
                    const cost = ns.corporation.getUnlockCost(unlockName);
                    if (corp.funds > cost * 10) { // Only buy if we have 10x the cost
                        ns.corporation.purchaseUnlock(unlockName);
                        ns.print(`✓ Unlocked ${unlockName} (Cost: $${ns.formatNumber(cost)})`);
                    }
                }
            } catch (e) {
                // Upgrade doesn't exist or can't be unlocked
            }
        }
    }

    /**
     * Purchase corporation upgrades
     */
    async function purchaseUpgrades(ns, corp) {
        // List of useful upgrades in priority order
        const upgrades = [
            "Wilson Analytics",   // Essential for production analysis
            "Smart Factories",    // Increases production
            "Smart Storage",      // Increases storage efficiency
            "AdVert.Inc",        // Improves sales (demand/competition)
            "FocusWires",        // Improves employee stats
            "Neural Accelerators", // Improves employee stats
            "Speech Processor Implants", // Improves employee stats
            "Nuoptimal Nootropic Injector Implants", // Improves employee stats
            "Project Insight",   // Reduces corruption
            "ABC SalesBots",     // Improves sales
            "DreamSense"         // Expensive late-game upgrade
        ];

        for (const upgradeName of upgrades) {
            try {
                const cost = ns.corporation.getUpgradeLevelCost(upgradeName);
                // Only buy if we have 100x the cost (don't spend all our money)
                if (corp.funds > cost * 100) {
                    ns.corporation.levelUpgrade(upgradeName);
                    ns.print(`✓ Upgraded ${upgradeName} (Cost: $${ns.formatNumber(cost)})`);
                }
            } catch (e) {
                // Can't afford or doesn't exist
            }
        }
    }
}
