/** @param {NS} ns */
export async function main(ns) {
    // Configuration
    const CORP_NAME = "MegaCorp";
    const AGRICULTURE = "Agriculture";
    const TOBACCO = "Tobacco";
    const CITIES = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
    const UPDATE_INTERVAL = 1000; // 1 second

    ns.disableLog("ALL");
    ns.clearLog();
    ns.tail();

    // State file for tracking progress
    const STATE_FILE = "/tmp/corp-state.txt";

    /**
     * Load or initialize state
     */
    function loadState() {
        if (ns.fileExists(STATE_FILE)) {
            try {
                return JSON.parse(ns.read(STATE_FILE));
            } catch {
                return getInitialState();
            }
        }
        return getInitialState();
    }

    function getInitialState() {
        return {
            phase: 0,
            subPhase: 0,
            investmentRound: 0,
            materialsPhase1Done: false,
            materialsPhase4aDone: false,
            materialsPhase4bDone: false,
            employeesReady: false
        };
    }

    function saveState(state) {
        ns.write(STATE_FILE, JSON.stringify(state), "w");
    }

    /**
     * Adjust selling prices to match production and prevent warehouse clogging
     */
    function adjustSellPrices(ns, corp) {
        // Only adjust if Agriculture division exists and we're past phase 2
        const divisions = corp.divisions || [];
        if (!divisions.includes(AGRICULTURE)) return;

        ns.print("--- Price Adjustments ---");

        for (const city of CITIES) {
            try {
                const warehouse = ns.corporation.getWarehouse(AGRICULTURE, city);

                // Adjust Plants selling
                const plants = ns.corporation.getMaterial(AGRICULTURE, city, "Plants");
                if (plants.desiredSellAmount !== "0" && plants.productionAmount > 0) {
                    adjustMaterialPrice(ns, city, "Plants", plants, warehouse);
                }

                // Adjust Food selling
                const food = ns.corporation.getMaterial(AGRICULTURE, city, "Food");
                if (food.desiredSellAmount !== "0" && food.productionAmount > 0) {
                    adjustMaterialPrice(ns, city, "Food", food, warehouse);
                }
            } catch (e) {
                // City not set up yet, skip
            }
        }
    }

    function adjustMaterialPrice(ns, city, materialName, material, warehouse) {
        const stored = material.stored;
        const production = material.productionAmount;
        const actualSales = material.actualSellAmount;
        const warehouseCapacity = warehouse.size;

        // Calculate how full the warehouse is with this material
        const fillPercentage = stored / warehouseCapacity;

        // Calculate sales to production ratio
        const salesRatio = production > 0 ? actualSales / production : 0;

        // Determine price adjustment
        let newPrice = material.desiredSellPrice || "MP";
        let reason = "";

        // If warehouse is filling up (>10% of capacity), reduce price significantly
        if (fillPercentage > 0.1) {
            // Reduce price based on how full the warehouse is
            const reduction = Math.max(0.4, 1 - (fillPercentage * 2));
            newPrice = `MP*${reduction.toFixed(2)}`;
            reason = `warehouse ${(fillPercentage * 100).toFixed(1)}% full`;
        }
        // If stored is very low but sales < production, reduce price to move inventory
        else if (stored > production * 2 && actualSales < production * 0.95) {
            newPrice = "MP*0.90";
            reason = "stored > 2×prod, sales < 95%";
        }
        // If stored == 0 and sales == production, increase price to maximize profit
        else if (stored < production * 0.1 && salesRatio > 0.99 && salesRatio <= 1.01) {
            // Gradually increase price to find the sweet spot
            newPrice = "MP*1.02";
            reason = "low stock, perfect sales - increase for profit";
        }
        // If sales are too high (>production) and inventory is low, increase price
        else if (stored < production && actualSales > production * 1.05) {
            newPrice = "MP*1.05";
            reason = "overselling - increase price";
        }
        // Target: sales at 95-99% of production (sweet spot)
        else if (salesRatio >= 0.95 && salesRatio < 0.99 && stored < production * 2) {
            // Perfect balance - maintain current price or use MP
            newPrice = "MP*1.01";
            reason = "sweet spot (95-99% sales)";
        }
        // If sales too low compared to production, reduce price
        else if (salesRatio < 0.90 && stored > 0) {
            newPrice = "MP*0.85";
            reason = "underselling (<90%)";
        }
        // Default to market price
        else {
            newPrice = "MP";
            reason = "balanced";
        }

        // Only update if price changed
        if (newPrice !== material.desiredSellPrice) {
            try {
                ns.corporation.sellMaterial(AGRICULTURE, city, materialName, "MAX", newPrice);
                ns.print(`${city} ${materialName}: ${material.desiredSellPrice} → ${newPrice}`);
                ns.print(`  Store:${stored.toFixed(1)} Prod:${production.toFixed(1)} Sales:${actualSales.toFixed(1)} (${(salesRatio * 100).toFixed(1)}%) - ${reason}`);
            } catch (e) {
                // Ignore errors
            }
        }
    }

    let state = loadState();

    ns.print("=== Corporation Automation Started ===");
    ns.print(`Current Phase: ${state.phase}`);
    ns.print("");

    while (true) {
        try {
            const corp = ns.corporation.getCorporation();

            ns.clearLog();
            ns.print("=== Corporation Status ===");
            ns.print(`Phase: ${state.phase} | SubPhase: ${state.subPhase}`);
            ns.print(`Funds: $${ns.formatNumber(corp.funds)}`);
            ns.print(`Revenue: $${ns.formatNumber(corp.revenue)}/s`);
            ns.print(`Profit: $${ns.formatNumber(corp.revenue - corp.expenses)}/s`);
            ns.print(`State: ${corp.state}`);
            ns.print("");

            // Adjust selling prices only during START phase (once per cycle)
            if (state.phase >= 2 && corp.state === "START") {
                adjustSellPrices(ns, corp);
            }

            // Phase execution
            if (state.phase === 0) {
                await phase0_InitialSetup(ns, corp, state);
            } else if (state.phase === 1) {
                await phase1_SmartSupply(ns, corp, state);
            } else if (state.phase === 2) {
                await phase2_Expansion(ns, corp, state);
            } else if (state.phase === 3) {
                await phase3_FirstGrowth(ns, corp, state);
            } else if (state.phase === 4) {
                await phase4_ScaleUp(ns, corp, state);
            } else if (state.phase === 5) {
                await phase5_TobaccoDivision(ns, corp, state);
            } else if (state.phase === 6) {
                await phase6_Maintenance(ns, corp, state);
            }

            saveState(state);

        } catch (error) {
            ns.print(`ERROR: ${error}`);
        }

        await ns.sleep(UPDATE_INTERVAL);
    }

    /**
     * PHASE 0: Initial Setup
     */
    async function phase0_InitialSetup(ns, corp, state) {
        ns.print("=== PHASE 0: Initial Setup ===");

        // Check if Agriculture division exists
        const divisions = corp.divisions || [];
        if (!divisions.includes(AGRICULTURE)) {
            try {
                ns.corporation.expandIndustry(AGRICULTURE, AGRICULTURE);
                ns.print(`✓ Created ${AGRICULTURE} division`);
                state.phase = 1;
                state.subPhase = 0;
                return; // Wait for next iteration to let division initialize
            } catch (e) {
                ns.print(`⏳ Waiting to create ${AGRICULTURE} division`);
                return;
            }
        }

        ns.print(`✓ ${AGRICULTURE} division exists`);
        state.phase = 1;
        state.subPhase = 0;
    }

    /**
     * PHASE 1: Buy Smart Supply
     */
    async function phase1_SmartSupply(ns, corp, state) {
        ns.print("=== PHASE 1: Smart Supply ===");

        // Verify Agriculture division exists
        const divisions = corp.divisions || [];
        if (!divisions.includes(AGRICULTURE)) {
            ns.print(`⏳ Waiting for ${AGRICULTURE} division to be ready`);
            return;
        }

        // Check if Smart Supply is unlocked
        const hasSmartSupply = ns.corporation.hasUnlock("Smart Supply");
        if (!hasSmartSupply) {
            const cost = ns.corporation.getUnlockCost("Smart Supply");
            if (corp.funds >= cost) {
                ns.corporation.purchaseUnlock("Smart Supply");
                ns.print(`✓ Unlocked Smart Supply ($${ns.formatNumber(cost)})`);
            } else {
                ns.print(`⏳ Need $${ns.formatNumber(cost)} for Smart Supply`);
                ns.print(`   Current: $${ns.formatNumber(corp.funds)}`);
                return;
            }
        }

        // Smart Supply is unlocked, move to expansion phase
        // (We'll enable it when we expand to cities in Phase 2)
        ns.print(`✓ Smart Supply unlocked`);
        state.phase = 2;
        state.subPhase = 0;
    }

    /**
     * PHASE 2: Expand to all cities
     */
    async function phase2_Expansion(ns, corp, state) {
        ns.print("=== PHASE 2: Expansion ===");

        const division = ns.corporation.getDivision(AGRICULTURE);
        const divisionCities = division.cities || [];

        // Expand to all cities
        for (const city of CITIES) {
            if (!divisionCities.includes(city)) {
                try {
                    ns.corporation.expandCity(AGRICULTURE, city);
                    ns.print(`✓ Expanded to ${city}`);
                } catch (e) {
                    ns.print(`⏳ Can't afford expansion to ${city} yet`);
                    return;
                }
            }
        }

        // Set up all cities in one go
        const positions = ["Operations", "Engineer", "Business"];

        for (const city of CITIES) {
            // Upgrade office to size 3
            let office;
            try {
                office = ns.corporation.getOffice(AGRICULTURE, city);
                if (office.size < 3) {
                    ns.corporation.upgradeOfficeSize(AGRICULTURE, city, 3 - office.size);
                    ns.print(`✓ Office size 3 in ${city}`);
                }
            } catch (e) {
                ns.print(`⏳ Can't afford office upgrade in ${city}`);
                return;
            }

            // Buy warehouse
            let hasWarehouse = true;
            try {
                ns.corporation.getWarehouse(AGRICULTURE, city);
            } catch {
                hasWarehouse = false;
            }

            if (!hasWarehouse) {
                try {
                    ns.corporation.purchaseWarehouse(AGRICULTURE, city);
                    ns.print(`✓ Warehouse purchased in ${city}`);
                } catch (e) {
                    ns.print(`⏳ Can't afford warehouse in ${city}`);
                    return;
                }
            }

            // Upgrade warehouse to 300
            const warehouse = ns.corporation.getWarehouse(AGRICULTURE, city);
            if (warehouse.size < 300) {
                try {
                    const neededLevels = Math.ceil((300 - warehouse.size) / 100);
                    ns.corporation.upgradeWarehouse(AGRICULTURE, city, neededLevels);
                    ns.print(`✓ Warehouse 300 in ${city}`);
                } catch (e) {
                    ns.print(`⏳ Can't afford warehouse upgrade in ${city}`);
                    return;
                }
            }

            // Hire all 3 employees
            const currentOffice = ns.corporation.getOffice(AGRICULTURE, city);
            for (let i = currentOffice.numEmployees; i < 3; i++) {
                const hired = ns.corporation.hireEmployee(AGRICULTURE, city, positions[i]);
                if (!hired) {
                    ns.print(`⏳ Failed to hire in ${city}`);
                    return;
                }
            }
            ns.print(`✓ Hired 3 employees in ${city}`);

            // Enable Smart Supply and selling
            try {
                ns.corporation.setSmartSupply(AGRICULTURE, city, true);
                ns.corporation.sellMaterial(AGRICULTURE, city, "Plants", "MAX", "MP");
                ns.corporation.sellMaterial(AGRICULTURE, city, "Food", "MAX", "MP");
                ns.print(`✓ Smart Supply & selling in ${city}`);
            } catch (e) {
                ns.print(`⚠ Setup failed in ${city}: ${e}`);
            }
        }

        // Buy 1 AdVert.Inc
        const division2 = ns.corporation.getDivision(AGRICULTURE);
        if (division2.awareness < 1000) {
            try {
                ns.corporation.hireAdVert(AGRICULTURE);
                ns.print(`✓ Purchased AdVert.Inc`);
            } catch (e) {
                ns.print(`⏳ Can't afford AdVert.Inc yet`);
                return;
            }
        }

        ns.print(`✓ All cities expanded and set up`);
        state.phase = 3;
        state.subPhase = 0;
    }

    /**
     * PHASE 3: First Growth
     */
    async function phase3_FirstGrowth(ns, corp, state) {
        ns.print("=== PHASE 3: First Growth ===");

        // SubPhase 0: Buy upgrades (2 rounds)
        if (state.subPhase === 0) {
            const upgrades = [
                "FocusWires",
                "Neural Accelerators",
                "Speech Processor Implants",
                "Nuoptimal Nootropic Injector Implants",
                "Smart Factories"
            ];

            // Buy all upgrades to level 2 in one go
            for (const upgrade of upgrades) {
                const level = ns.corporation.getUpgradeLevel(upgrade);
                for (let i = level; i < 2; i++) {
                    try {
                        ns.corporation.levelUpgrade(upgrade);
                        ns.print(`✓ ${upgrade} to level ${i + 1}`);
                    } catch (e) {
                        ns.print(`⏳ Can't afford ${upgrade} yet`);
                        return;
                    }
                }
            }

            ns.print(`✓ All upgrades at level 2`);
            state.subPhase = 1;
        }

        // SubPhase 1: Buy materials (Hardware, AI Cores, Real Estate)
        if (state.subPhase === 1) {
            if (!state.materialsPhase1Done) {
                let allPurchased = true;
                for (const city of CITIES) {
                    // Check current stored amounts
                    const hardware = ns.corporation.getMaterial(AGRICULTURE, city, "Hardware");
                    const aiCores = ns.corporation.getMaterial(AGRICULTURE, city, "AI Cores");
                    const realEstate = ns.corporation.getMaterial(AGRICULTURE, city, "Real Estate");

                    // Calculate how much more is needed
                    const hardwareNeeded = Math.max(0, 125 - hardware.stored);
                    const aiNeeded = Math.max(0, 75 - aiCores.stored);
                    const realEstateNeeded = Math.max(0, 25000 - realEstate.stored);

                    // Buy only what's needed
                    if (hardwareNeeded > 0 || aiNeeded > 0 || realEstateNeeded > 0) {
                        let purchased = 0;
                        if (hardwareNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(AGRICULTURE, city, "Hardware", hardwareNeeded);
                            if (result > 0) purchased++;
                            ns.print(`  Hardware: ${result}/${hardwareNeeded} (have ${hardware.stored})`);
                        }
                        if (aiNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(AGRICULTURE, city, "AI Cores", aiNeeded);
                            if (result > 0) purchased++;
                            ns.print(`  AI Cores: ${result}/${aiNeeded} (have ${aiCores.stored})`);
                        }
                        if (realEstateNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(AGRICULTURE, city, "Real Estate", realEstateNeeded);
                            if (result > 0) purchased++;
                            ns.print(`  Real Estate: ${result}/${realEstateNeeded} (have ${realEstate.stored})`);
                        }

                        if (purchased === 0) {
                            allPurchased = false;
                            ns.print(`⏳ ${city}: Waiting for funds to buy materials`);
                        }
                    } else {
                        ns.print(`✓ ${city}: Already has all materials`);
                    }
                }

                if (allPurchased) {
                    state.materialsPhase1Done = true;
                    ns.print(`✓ All materials purchased`);
                }
                return;
            }

            ns.print(`✓ Materials purchased, moving to investment`);
            state.subPhase = 2;
        }

        // SubPhase 2: Accept first investment
        if (state.subPhase === 2) {
            if (state.investmentRound === 0) {
                const offer = ns.corporation.getInvestmentOffer();
                if (offer.round === 1) {
                    ns.print(`💰 Investment offer: $${ns.formatNumber(offer.funds)} for ${offer.shares} shares`);
                    if (offer.funds >= 1.4e11) { // At least $140b
                        ns.corporation.acceptInvestmentOffer();
                        ns.print(`✓ Accepted investment round 1`);
                        state.investmentRound = 1;
                        state.phase = 4;
                        state.subPhase = 0;
                    }
                }
            }
        }
    }

    /**
     * PHASE 4: Scale Up
     */
    async function phase4_ScaleUp(ns, corp, state) {
        ns.print("=== PHASE 4: Scale Up ===");

        // SubPhase 0: Upgrade offices to 9 employees
        if (state.subPhase === 0) {
            // Target: Ops(2), Eng(2), Bus(1), Mgmt(2), R&D(2)
            const targetJobs = {
                "Operations": 2,
                "Engineer": 2,
                "Business": 1,
                "Management": 2,
                "Research & Development": 2
            };

            let allDone = true;
            for (const city of CITIES) {
                const office = ns.corporation.getOffice(AGRICULTURE, city);

                // Upgrade office size if needed
                if (office.size < 9) {
                    allDone = false;
                    try {
                        ns.corporation.upgradeOfficeSize(AGRICULTURE, city, 9 - office.size);
                        ns.print(`✓ Upgraded office in ${city} to 9`);
                    } catch (e) {
                        ns.print(`⏳ Can't afford office upgrade in ${city}`);
                        return;
                    }
                }

                // Hire employees based on what's missing
                for (const [position, targetCount] of Object.entries(targetJobs)) {
                    const currentCount = office.employeeJobs[position] || 0;
                    const needed = targetCount - currentCount;

                    if (needed > 0) {
                        allDone = false;
                        const hired = ns.corporation.hireEmployee(AGRICULTURE, city, position);
                        if (hired) {
                            ns.print(`✓ Hired ${position} in ${city} (${currentCount + 1}/${targetCount})`);
                        } else {
                            ns.print(`⏳ Failed to hire ${position} in ${city}`);
                            return;
                        }
                    }
                }
            }

            if (allDone) {
                ns.print(`✓ All offices upgraded to 9 employees`);
                state.subPhase = 1;
            }
        }

        // SubPhase 1: Upgrade Smart Factories and Smart Storage to level 5
        if (state.subPhase === 1) {
            const factories = ns.corporation.getUpgradeLevel("Smart Factories");
            const storage = ns.corporation.getUpgradeLevel("Smart Storage");

            if (factories < 5) {
                try {
                    ns.corporation.levelUpgrade("Smart Factories");
                    ns.print(`✓ Smart Factories to level ${factories + 1}`);
                    return;
                } catch (e) {
                    ns.print(`⏳ Can't afford Smart Factories upgrade`);
                    return;
                }
            }

            if (storage < 5) {
                try {
                    ns.corporation.levelUpgrade("Smart Storage");
                    ns.print(`✓ Smart Storage to level ${storage + 1}`);
                    return;
                } catch (e) {
                    ns.print(`⏳ Can't afford Smart Storage upgrade`);
                    return;
                }
            }

            ns.print(`✓ Smart Factories and Smart Storage at level 5`);
            state.subPhase = 2;
        }

        // SubPhase 2: Upgrade warehouses to 1000
        if (state.subPhase === 2) {
            let allUpgraded = true;
            for (const city of CITIES) {
                const warehouse = ns.corporation.getWarehouse(AGRICULTURE, city);
                if (warehouse.size < 1000) {
                    allUpgraded = false;
                    try {
                        const neededLevels = Math.min(7, Math.ceil((1000 - warehouse.size) / 100));
                        ns.corporation.upgradeWarehouse(AGRICULTURE, city, neededLevels);
                        ns.print(`✓ Upgraded warehouse in ${city}`);
                    } catch (e) {
                        ns.print(`⏳ Can't afford warehouse upgrade in ${city}`);
                        return;
                    }
                }
            }

            if (allUpgraded) {
                ns.print(`✓ All warehouses at 1000`);
                state.subPhase = 3;
            }
        }

        // SubPhase 3: Buy more materials (Hardware: 1400, Robots: 48, AI Cores: 1260, Real Estate: 73200)
        if (state.subPhase === 3) {
            if (!state.materialsPhase4aDone) {
                let allPurchased = true;
                for (const city of CITIES) {
                    // Check current stored amounts
                    const hardware = ns.corporation.getMaterial(AGRICULTURE, city, "Hardware");
                    const robots = ns.corporation.getMaterial(AGRICULTURE, city, "Robots");
                    const aiCores = ns.corporation.getMaterial(AGRICULTURE, city, "AI Cores");
                    const realEstate = ns.corporation.getMaterial(AGRICULTURE, city, "Real Estate");

                    // Calculate how much more is needed
                    const hardwareNeeded = Math.max(0, 1400 - hardware.stored);
                    const robotsNeeded = Math.max(0, 48 - robots.stored);
                    const aiNeeded = Math.max(0, 1260 - aiCores.stored);
                    const realEstateNeeded = Math.max(0, 73200 - realEstate.stored);

                    // Buy only what's needed
                    if (hardwareNeeded > 0 || robotsNeeded > 0 || aiNeeded > 0 || realEstateNeeded > 0) {
                        let purchased = 0;
                        if (hardwareNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(AGRICULTURE, city, "Hardware", hardwareNeeded);
                            if (result > 0) purchased++;
                            ns.print(`  Hardware: ${result}/${hardwareNeeded} (have ${hardware.stored})`);
                        }
                        if (robotsNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(AGRICULTURE, city, "Robots", robotsNeeded);
                            if (result > 0) purchased++;
                            ns.print(`  Robots: ${result}/${robotsNeeded} (have ${robots.stored})`);
                        }
                        if (aiNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(AGRICULTURE, city, "AI Cores", aiNeeded);
                            if (result > 0) purchased++;
                            ns.print(`  AI Cores: ${result}/${aiNeeded} (have ${aiCores.stored})`);
                        }
                        if (realEstateNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(AGRICULTURE, city, "Real Estate", realEstateNeeded);
                            if (result > 0) purchased++;
                            ns.print(`  Real Estate: ${result}/${realEstateNeeded} (have ${realEstate.stored})`);
                        }

                        if (purchased === 0) {
                            allPurchased = false;
                            ns.print(`⏳ ${city}: Waiting for funds to buy materials`);
                        }
                    } else {
                        ns.print(`✓ ${city}: Already has all materials`);
                    }
                }

                if (allPurchased) {
                    state.materialsPhase4aDone = true;
                    ns.print(`✓ All materials purchased`);
                }
                return;
            }

            ns.print(`✓ First material batch purchased`);
            state.subPhase = 4;
        }

        // SubPhase 4: Accept second investment
        if (state.subPhase === 4) {
            if (state.investmentRound === 1) {
                const offer = ns.corporation.getInvestmentOffer();
                if (offer.round === 2) {
                    ns.print(`💰 Investment offer: $${ns.formatNumber(offer.funds)}`);
                    if (offer.funds >= 5e12) { // At least $5t
                        ns.corporation.acceptInvestmentOffer();
                        ns.print(`✓ Accepted investment round 2`);
                        state.investmentRound = 2;
                        state.subPhase = 5;
                    }
                }
            }
        }

        // SubPhase 5: Upgrade warehouses to 3800
        if (state.subPhase === 5) {
            let allUpgraded = true;
            for (const city of CITIES) {
                const warehouse = ns.corporation.getWarehouse(AGRICULTURE, city);
                if (warehouse.size < 3800) {
                    allUpgraded = false;
                    try {
                        const neededLevels = Math.min(9, Math.ceil((3800 - warehouse.size) / 100));
                        ns.corporation.upgradeWarehouse(AGRICULTURE, city, neededLevels);
                        ns.print(`✓ Upgraded warehouse in ${city}`);
                    } catch (e) {
                        ns.print(`⏳ Can't afford warehouse upgrade in ${city}`);
                        return;
                    }
                }
            }

            if (allUpgraded) {
                ns.print(`✓ All warehouses at 3800`);
                state.subPhase = 6;
            }
        }

        // SubPhase 6: Buy final materials (Hardware: 9300, Robots: 726, AI Cores: 6270, Real Estate: 230400)
        if (state.subPhase === 6) {
            if (!state.materialsPhase4bDone) {
                let allPurchased = true;
                for (const city of CITIES) {
                    // Check current stored amounts
                    const hardware = ns.corporation.getMaterial(AGRICULTURE, city, "Hardware");
                    const robots = ns.corporation.getMaterial(AGRICULTURE, city, "Robots");
                    const aiCores = ns.corporation.getMaterial(AGRICULTURE, city, "AI Cores");
                    const realEstate = ns.corporation.getMaterial(AGRICULTURE, city, "Real Estate");

                    // Calculate how much more is needed
                    const hardwareNeeded = Math.max(0, 9300 - hardware.stored);
                    const robotsNeeded = Math.max(0, 726 - robots.stored);
                    const aiNeeded = Math.max(0, 6270 - aiCores.stored);
                    const realEstateNeeded = Math.max(0, 230400 - realEstate.stored);

                    // Buy only what's needed
                    if (hardwareNeeded > 0 || robotsNeeded > 0 || aiNeeded > 0 || realEstateNeeded > 0) {
                        let purchased = 0;
                        if (hardwareNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(AGRICULTURE, city, "Hardware", hardwareNeeded);
                            if (result > 0) purchased++;
                            ns.print(`  Hardware: ${result}/${hardwareNeeded} (have ${hardware.stored})`);
                        }
                        if (robotsNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(AGRICULTURE, city, "Robots", robotsNeeded);
                            if (result > 0) purchased++;
                            ns.print(`  Robots: ${result}/${robotsNeeded} (have ${robots.stored})`);
                        }
                        if (aiNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(AGRICULTURE, city, "AI Cores", aiNeeded);
                            if (result > 0) purchased++;
                            ns.print(`  AI Cores: ${result}/${aiNeeded} (have ${aiCores.stored})`);
                        }
                        if (realEstateNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(AGRICULTURE, city, "Real Estate", realEstateNeeded);
                            if (result > 0) purchased++;
                            ns.print(`  Real Estate: ${result}/${realEstateNeeded} (have ${realEstate.stored})`);
                        }

                        if (purchased === 0) {
                            allPurchased = false;
                            ns.print(`⏳ ${city}: Waiting for funds to buy materials`);
                        }
                    } else {
                        ns.print(`✓ ${city}: Already has all materials`);
                    }
                }

                if (allPurchased) {
                    state.materialsPhase4bDone = true;
                    ns.print(`✓ All materials purchased`);
                }
                return;
            }

            ns.print(`✓ Final materials purchased`);
            ns.print(`✓ Production Multiplier should be over 500`);
            state.phase = 5;
            state.subPhase = 0;
        }
    }

    /**
     * PHASE 5: Tobacco Division
     */
    async function phase5_TobaccoDivision(ns, corp, state) {
        ns.print("=== PHASE 5: Tobacco Division ===");
        ns.print("⏳ Manual phase - Create Tobacco division");
        ns.print("   Follow guide for product development");
        ns.print("   Set phase to 6 when ready for maintenance");
    }

    /**
     * PHASE 6: Maintenance
     */
    async function phase6_Maintenance(ns, corp, state) {
        ns.print("=== PHASE 6: Maintenance Mode ===");
        ns.print("Corporation is running!");

        // Auto-buy Wilson Analytics when funds > $3t
        if (corp.funds > 3e12) {
            try {
                ns.corporation.levelUpgrade("Wilson Analytics");
                const level = ns.corporation.getUpgradeLevel("Wilson Analytics");
                ns.print(`✓ Wilson Analytics to level ${level}`);
            } catch (e) {
                // Can't afford
            }
        }
    }
}
