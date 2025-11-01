/** @param {NS} ns */
export async function main(ns) {
    // Configuration
    const UPDATE_INTERVAL = 10000; // 10 seconds
    const INITIAL_OFFICE_SIZE = 3; // Start with 3 employees
    const TARGET_OFFICE_SIZE = 30; // Expand to 30 employees per office
    const INITIAL_WAREHOUSE_SIZE = 300; // Initial warehouse size
    const TARGET_WAREHOUSE_SIZE = 3800; // Target warehouse size
    const SMART_SUPPLY_ENABLED = true;

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
            ns.print(`Divisions: ${corp.divisions.length}`);
            ns.print(`State: ${corp.state}`);
            ns.print("");

            // Manage each division
            for (const divisionName of corp.divisions) {
                await manageDivision(ns, divisionName, config, corp);
            }

            // Try to accept investment if needed
            await manageInvestment(ns, corp);

            // Purchase corporation upgrades
            await purchaseUpgrades(ns, corp);

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
        ns.print(`Cities: ${division.cities.length}`);
        ns.print("");

        // Expand to all cities if not already
        await expandToAllCities(ns, divisionName, config.cities);

        // Manage each city
        for (const city of division.cities) {
            await manageCity(ns, divisionName, city, corp);
        }
    }

    /**
     * Expand division to all cities
     */
    async function expandToAllCities(ns, divisionName, cities) {
        const division = ns.corporation.getDivision(divisionName);

        for (const city of cities) {
            if (!division.cities.includes(city)) {
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
        while (office.employees.length < office.size) {
            try {
                const employee = ns.corporation.hireEmployee(divisionName, city);
                if (employee) {
                    ns.print(`✓ Hired employee in ${city}`);
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
        const totalEmployees = office.employees.length;
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

        // Upgrade warehouse if needed
        if (warehouse.size < TARGET_WAREHOUSE_SIZE && corp.funds > 1e9) {
            try {
                const upgradeLevels = Math.min(10, Math.floor((TARGET_WAREHOUSE_SIZE - warehouse.size) / 100));
                if (upgradeLevels > 0) {
                    ns.corporation.upgradeWarehouse(divisionName, city, upgradeLevels);
                    ns.print(`✓ Upgraded warehouse in ${city} by ${upgradeLevels} levels`);
                }
            } catch (e) {
                // Can't upgrade
            }
        }

        // Enable smart supply
        if (SMART_SUPPLY_ENABLED) {
            try {
                const division = ns.corporation.getDivision(divisionName);
                if (division.type === "Agriculture") {
                    ns.corporation.setSmartSupply(divisionName, city, true);
                }
            } catch (e) {
                // Smart supply not unlocked yet
            }
        }

        // For Agriculture, set material purchases and sales
        if (ns.corporation.getDivision(divisionName).type === "Agriculture") {
            try {
                // Use bulk purchase for efficiency - buy materials needed for production
                ns.corporation.bulkPurchase(divisionName, city, "Water", 500);
                ns.corporation.bulkPurchase(divisionName, city, "Energy", 500);
                ns.corporation.bulkPurchase(divisionName, city, "Hardware", 125);
                ns.corporation.bulkPurchase(divisionName, city, "AI Cores", 75);
                ns.corporation.bulkPurchase(divisionName, city, "Real Estate", 27000);

                // Sell output
                ns.corporation.sellMaterial(divisionName, city, "Plants", "MAX", "MP");
                ns.corporation.sellMaterial(divisionName, city, "Food", "MAX", "MP");
            } catch (e) {
                // Material management failed
            }
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
     * Purchase corporation upgrades
     */
    async function purchaseUpgrades(ns, corp) {
        // List of useful upgrades
        const upgrades = [
            "Smart Factories",
            "Smart Storage",
            "DreamSense",
            "Wilson Analytics",
            "Nuoptimal Nootropic Injector Implants",
            "Speech Processor Implants",
            "Neural Accelerators",
            "FocusWires",
            "ABC SalesBots",
            "Project Insight"
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
