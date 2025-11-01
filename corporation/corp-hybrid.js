/** @param {NS} ns */
export async function main(ns) {
    // Configuration
    const INDUSTRY = "Agriculture"; // Use Agriculture for real business after exploit
    const CITIES = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
    const WAREHOUSE_SIZE = 300;
    const WAIT_CYCLES = 10; // Wait 10 START cycles for exploit
    const UPDATE_INTERVAL = 1000; // 1 second

    ns.disableLog("ALL");
    ns.clearLog();
    ns.tail();

    // State file for tracking progress
    const STATE_FILE = "/tmp/corp-hybrid-state.txt";

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
            cyclesWaited: 0,
            lastState: "",
            realEstatePurchased: false,
            investmentRound: 0,
            peakOffer: 0,
            materialsPhase1Done: false,
            materialsPhase4aDone: false,
            materialsPhase4bDone: false
        };
    }

    function saveState(state) {
        ns.write(STATE_FILE, JSON.stringify(state), "w");
    }

    /**
     * Adjust selling prices to match production and prevent warehouse clogging
     */
    function adjustSellPrices(ns, corp) {
        const divisions = corp.divisions || [];
        if (!divisions.includes(INDUSTRY)) return;

        for (const city of CITIES) {
            try {
                const plants = ns.corporation.getMaterial(INDUSTRY, city, "Plants");
                if (plants.desiredSellAmount !== "0" && plants.productionAmount > 0) {
                    adjustMaterialPrice(ns, city, "Plants", plants);
                }

                const food = ns.corporation.getMaterial(INDUSTRY, city, "Food");
                if (food.desiredSellAmount !== "0" && food.productionAmount > 0) {
                    adjustMaterialPrice(ns, city, "Food", food);
                }
            } catch (e) {
                // City not set up yet
            }
        }
    }

    function adjustMaterialPrice(ns, city, materialName, material) {
        const stored = material.stored;
        const production = material.productionAmount;
        const actualSales = material.actualSellAmount;
        const cycleProduction = production * 10;
        const inventoryRatio = cycleProduction > 0 ? stored / cycleProduction : 0;

        let priceMultiplier = 1.0;

        if (inventoryRatio > 0.1) {
            priceMultiplier = Math.max(0.5, 1.0 - (inventoryRatio * 0.5));
        } else if (inventoryRatio < 0.05 && actualSales > production * 0.95 && actualSales < production * 1.05) {
            priceMultiplier = 1.01;
        }

        const newPrice = priceMultiplier === 1.0 ? "MP" : `MP*${priceMultiplier.toFixed(2)}`;

        if (newPrice !== material.desiredSellPrice) {
            try {
                ns.corporation.sellMaterial(INDUSTRY, city, materialName, "MAX", newPrice);
            } catch (e) {
                // Ignore
            }
        }
    }

    let state = loadState();

    ns.print("=== Hybrid Corporation Strategy Started ===");
    ns.print(`Current Phase: ${state.phase}`);
    ns.print("");

    while (true) {
        try {
            const corp = ns.corporation.getCorporation();

            ns.clearLog();
            ns.print("=== Corporation Hybrid Status ===");
            ns.print(`Phase: ${state.phase} | SubPhase: ${state.subPhase}`);
            ns.print(`Investment Round: ${state.investmentRound}`);
            ns.print(`Funds: $${ns.formatNumber(corp.funds)}`);
            ns.print(`Revenue: $${ns.formatNumber(corp.revenue)}/s`);
            ns.print(`Profit: $${ns.formatNumber(corp.revenue - corp.expenses)}/s`);
            ns.print(`State: ${corp.state}`);
            ns.print("");

            // Adjust prices during business phases (after phase 10)
            if (state.phase >= 10 && corp.state === "START") {
                adjustSellPrices(ns, corp);
            }

            // Phase execution
            // Phases 0-9: Exploit strategy
            // Phases 10+: Real business strategy
            if (state.phase === 0) {
                await phase0_CreateAgriculture(ns, corp, state);
            } else if (state.phase === 1) {
                await phase1_ExpandCities(ns, corp, state);
            } else if (state.phase === 2) {
                await phase2_UpgradeWarehouses(ns, corp, state);
            } else if (state.phase === 3) {
                await phase3_HireEmployees(ns, corp, state);
            } else if (state.phase === 4) {
                await phase4_BuyAdVerts(ns, corp, state);
            } else if (state.phase === 5) {
                await phase5_BuyRealEstate(ns, corp, state);
            } else if (state.phase === 6) {
                await phase6_WaitCycles(ns, corp, state);
            } else if (state.phase === 7) {
                await phase7_SellRealEstate(ns, corp, state);
            } else if (state.phase === 8) {
                await phase8_WaitForInvestment(ns, corp, state);
            } else if (state.phase === 9) {
                await phase9_AcceptInvestment(ns, corp, state);
            } else if (state.phase === 10) {
                await phase10_BuyUpgrades(ns, corp, state);
            } else if (state.phase === 11) {
                await phase11_BuyMaterials(ns, corp, state);
            } else if (state.phase === 12) {
                await phase12_OfficeUpgrade(ns, corp, state);
            } else if (state.phase === 13) {
                await phase13_ScaleUp(ns, corp, state);
            } else if (state.phase === 14) {
                await phase14_SecondInvestment(ns, corp, state);
            } else if (state.phase === 15) {
                await phase15_FinalScale(ns, corp, state);
            } else if (state.phase === 16) {
                await phase16_Maintenance(ns, corp, state);
            }

            saveState(state);

        } catch (error) {
            ns.print(`ERROR: ${error}`);
        }

        await ns.sleep(UPDATE_INTERVAL);
    }

    // ========== EXPLOIT PHASES (0-9) ==========

    async function phase0_CreateAgriculture(ns, corp, state) {
        ns.print("=== PHASE 0: Create Agriculture ===");

        const divisions = corp.divisions || [];
        if (!divisions.includes(INDUSTRY)) {
            try {
                ns.corporation.expandIndustry(INDUSTRY, INDUSTRY);
                ns.print(`✓ Created ${INDUSTRY} division`);
                state.phase = 1;
            } catch (e) {
                ns.print(`⏳ Waiting to create ${INDUSTRY} division`);
            }
        } else {
            ns.print(`✓ ${INDUSTRY} division exists`);
            state.phase = 1;
        }
    }

    async function phase1_ExpandCities(ns, corp, state) {
        ns.print("=== PHASE 1: Expand to All Cities ===");

        const division = ns.corporation.getDivision(INDUSTRY);
        const divisionCities = division.cities || [];

        for (const city of CITIES) {
            if (!divisionCities.includes(city)) {
                try {
                    ns.corporation.expandCity(INDUSTRY, city);
                    ns.print(`✓ Expanded to ${city}`);
                } catch (e) {
                    ns.print(`⏳ Can't afford expansion to ${city}`);
                    return;
                }
            }
        }

        ns.print(`✓ Expanded to all cities`);
        state.phase = 2;
    }

    async function phase2_UpgradeWarehouses(ns, corp, state) {
        ns.print("=== PHASE 2: Upgrade Warehouses ===");

        for (const city of CITIES) {
            let hasWarehouse = true;
            try {
                ns.corporation.getWarehouse(INDUSTRY, city);
            } catch {
                hasWarehouse = false;
            }

            if (!hasWarehouse) {
                try {
                    ns.corporation.purchaseWarehouse(INDUSTRY, city);
                    ns.print(`✓ Purchased warehouse in ${city}`);
                } catch (e) {
                    ns.print(`⏳ Can't afford warehouse in ${city}`);
                    return;
                }
            }

            const warehouse = ns.corporation.getWarehouse(INDUSTRY, city);
            if (warehouse.size < WAREHOUSE_SIZE) {
                try {
                    const neededLevels = Math.ceil((WAREHOUSE_SIZE - warehouse.size) / 100);
                    ns.corporation.upgradeWarehouse(INDUSTRY, city, neededLevels);
                    ns.print(`✓ Upgraded warehouse in ${city} to ${WAREHOUSE_SIZE}`);
                } catch (e) {
                    ns.print(`⏳ Can't afford warehouse upgrade in ${city}`);
                    return;
                }
            }
        }

        ns.print(`✓ All warehouses at ${WAREHOUSE_SIZE}`);
        state.phase = 3;
    }

    async function phase3_HireEmployees(ns, corp, state) {
        ns.print("=== PHASE 3: Hire Employees ===");

        for (const city of CITIES) {
            let office;
            try {
                office = ns.corporation.getOffice(INDUSTRY, city);
            } catch {
                try {
                    ns.corporation.upgradeOfficeSize(INDUSTRY, city, 3);
                    office = ns.corporation.getOffice(INDUSTRY, city);
                    ns.print(`✓ Created office in ${city}`);
                } catch (e) {
                    ns.print(`⏳ Can't afford office in ${city}`);
                    return;
                }
            }

            const businessEmployees = office.employeeJobs["Business"] || 0;
            if (businessEmployees < 3) {
                const needed = 3 - businessEmployees;
                for (let i = 0; i < needed; i++) {
                    const hired = ns.corporation.hireEmployee(INDUSTRY, city, "Business");
                    if (!hired) {
                        ns.print(`⏳ Failed to hire Business in ${city}`);
                        return;
                    }
                }
                ns.print(`✓ ${city}: Hired 3 Business employees`);
            }
        }

        ns.print(`✓ All employees hired`);
        state.phase = 4;
    }

    async function phase4_BuyAdVerts(ns, corp, state) {
        ns.print("=== PHASE 4: Buy AdVerts ===");

        const division = ns.corporation.getDivision(INDUSTRY);
        const currentAdVerts = division.numAdVerts || 0;

        if (currentAdVerts < 10) {
            try {
                ns.corporation.hireAdVert(INDUSTRY);
                ns.print(`✓ Hired AdVert ${currentAdVerts + 1}/10`);
            } catch (e) {
                ns.print(`⏳ Can't afford AdVert yet`);
            }
        } else {
            ns.print(`✓ All 10 AdVerts hired`);
            state.phase = 5;
        }
    }

    async function phase5_BuyRealEstate(ns, corp, state) {
        ns.print("=== PHASE 5: Fill Warehouses with Real Estate (EXPLOIT) ===");

        if (!state.realEstatePurchased) {
            for (const city of CITIES) {
                const warehouse = ns.corporation.getWarehouse(INDUSTRY, city);
                const realEstate = ns.corporation.getMaterial(INDUSTRY, city, "Real Estate");

                const maxRealEstate = Math.floor(warehouse.size / 0.005);
                const needed = Math.max(0, maxRealEstate - realEstate.stored);

                if (needed > 0) {
                    const result = ns.corporation.bulkPurchase(INDUSTRY, city, "Real Estate", needed);
                    if (result > 0) {
                        ns.print(`✓ ${city}: Purchased ${result} Real Estate`);
                    } else {
                        ns.print(`⏳ ${city}: Can't afford Real Estate`);
                        return;
                    }
                }
            }

            state.realEstatePurchased = true;
            ns.print(`✓ All warehouses filled with Real Estate`);
        }

        state.phase = 6;
    }

    async function phase6_WaitCycles(ns, corp, state) {
        ns.print("=== PHASE 6: Waiting 10 START Cycles ===");
        ns.print(`START cycles: ${state.cyclesWaited}/${WAIT_CYCLES}`);
        ns.print(`Estimated time: ~${((state.cyclesWaited * 20) / 60).toFixed(1)} / ~3.3 minutes`);

        if (corp.state === "START" && state.lastState !== "START") {
            state.cyclesWaited++;
            ns.print(`✓ START cycle ${state.cyclesWaited} completed`);
        }
        state.lastState = corp.state;

        if (state.cyclesWaited >= WAIT_CYCLES) {
            ns.print(`✓ Waited ${WAIT_CYCLES} START cycles!`);
            state.phase = 7;
        }
    }

    async function phase7_SellRealEstate(ns, corp, state) {
        ns.print("=== PHASE 7: SELL REAL ESTATE ===");

        for (const city of CITIES) {
            try {
                ns.corporation.sellMaterial(INDUSTRY, city, "Real Estate", "MAX", "MP");
                ns.print(`✓ ${city}: Selling Real Estate`);
            } catch (e) {
                ns.print(`⚠ ${city}: Failed to set selling`);
            }
        }

        ns.print(`✓ All Real Estate set to sell!`);
        state.phase = 8;
        state.peakOffer = 0;
    }

    async function phase8_WaitForInvestment(ns, corp, state) {
        ns.print("=== PHASE 8: Monitoring Investment Offer ===");

        try {
            const offer = ns.corporation.getInvestmentOffer();

            ns.print(`Investment Round: ${offer.round}`);
            ns.print(`Current Offer: $${ns.formatNumber(offer.funds)}`);
            ns.print(`Peak Offer: $${ns.formatNumber(state.peakOffer)}`);

            if (offer.funds > state.peakOffer) {
                state.peakOffer = offer.funds;
            }

            // Check Real Estate levels
            let totalRealEstate = 0;
            for (const city of CITIES) {
                const material = ns.corporation.getMaterial(INDUSTRY, city, "Real Estate");
                totalRealEstate += material.stored;
            }
            ns.print(`Real Estate remaining: ${totalRealEstate.toFixed(0)}`);

            // Auto-accept when offer drops or Real Estate nearly gone
            if (state.peakOffer > 0 && (offer.funds < state.peakOffer * 0.95 || totalRealEstate < 100)) {
                ns.print(`⚠ OFFER DROPPING or Real Estate sold! Accepting...`);
                state.phase = 9;
            }

        } catch (e) {
            ns.print(`Waiting for investment offer...`);
        }
    }

    async function phase9_AcceptInvestment(ns, corp, state) {
        ns.print("=== PHASE 9: Accept Investment ===");

        try {
            const offer = ns.corporation.getInvestmentOffer();
            if (offer.round === 1 && offer.funds >= 100e9) {
                ns.corporation.acceptInvestmentOffer();
                ns.print(`✓ Accepted Round 1: $${ns.formatNumber(offer.funds)}`);
                state.investmentRound = 1;

                // Clear Real Estate from all cities
                for (const city of CITIES) {
                    try {
                        ns.corporation.sellMaterial(INDUSTRY, city, "Real Estate", "0", "");
                    } catch (e) {
                        // Ignore
                    }
                }

                state.phase = 10;
                ns.print(`✓ Transitioning to real business model...`);
            }
        } catch (e) {
            ns.print(`⚠ Failed to accept: ${e}`);
        }
    }

    // ========== REAL BUSINESS PHASES (10+) ==========

    async function phase10_BuyUpgrades(ns, corp, state) {
        ns.print("=== PHASE 10: Buy Upgrades (Level 2) ===");

        const upgrades = [
            "FocusWires",
            "Neural Accelerators",
            "Speech Processor Implants",
            "Nuoptimal Nootropic Injector Implants",
            "Smart Factories"
        ];

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
        state.phase = 11;
    }

    async function phase11_BuyMaterials(ns, corp, state) {
        ns.print("=== PHASE 11: Buy Initial Materials ===");

        if (!state.materialsPhase1Done) {
            let allPurchased = true;
            for (const city of CITIES) {
                const hardware = ns.corporation.getMaterial(INDUSTRY, city, "Hardware");
                const aiCores = ns.corporation.getMaterial(INDUSTRY, city, "AI Cores");
                const realEstate = ns.corporation.getMaterial(INDUSTRY, city, "Real Estate");

                const hardwareNeeded = Math.max(0, 125 - hardware.stored);
                const aiNeeded = Math.max(0, 75 - aiCores.stored);
                const realEstateNeeded = Math.max(0, 25000 - realEstate.stored);

                if (hardwareNeeded > 0 || aiNeeded > 0 || realEstateNeeded > 0) {
                    let purchased = 0;
                    if (hardwareNeeded > 0) {
                        const result = ns.corporation.bulkPurchase(INDUSTRY, city, "Hardware", hardwareNeeded);
                        if (result > 0) purchased++;
                    }
                    if (aiNeeded > 0) {
                        const result = ns.corporation.bulkPurchase(INDUSTRY, city, "AI Cores", aiNeeded);
                        if (result > 0) purchased++;
                    }
                    if (realEstateNeeded > 0) {
                        const result = ns.corporation.bulkPurchase(INDUSTRY, city, "Real Estate", realEstateNeeded);
                        if (result > 0) purchased++;
                    }

                    if (purchased === 0) {
                        allPurchased = false;
                        ns.print(`⏳ ${city}: Waiting for funds`);
                    }
                }
            }

            if (allPurchased) {
                state.materialsPhase1Done = true;

                // Enable Smart Supply and selling
                for (const city of CITIES) {
                    try {
                        ns.corporation.setSmartSupply(INDUSTRY, city, true);
                        ns.corporation.sellMaterial(INDUSTRY, city, "Plants", "MAX", "MP");
                        ns.corporation.sellMaterial(INDUSTRY, city, "Food", "MAX", "MP");
                    } catch (e) {
                        // Ignore
                    }
                }

                ns.print(`✓ Materials purchased, Smart Supply enabled`);
            }
            return;
        }

        state.phase = 12;
    }

    async function phase12_OfficeUpgrade(ns, corp, state) {
        ns.print("=== PHASE 12: Upgrade Offices to 9 ===");

        const targetJobs = {
            "Operations": 2,
            "Engineer": 2,
            "Business": 1,
            "Management": 2,
            "Research & Development": 2
        };

        let allDone = true;
        for (const city of CITIES) {
            const office = ns.corporation.getOffice(INDUSTRY, city);

            if (office.size < 9) {
                allDone = false;
                try {
                    ns.corporation.upgradeOfficeSize(INDUSTRY, city, 9 - office.size);
                    ns.print(`✓ Upgraded office in ${city} to 9`);
                } catch (e) {
                    ns.print(`⏳ Can't afford office upgrade in ${city}`);
                    return;
                }
            }

            for (const [position, targetCount] of Object.entries(targetJobs)) {
                const currentCount = office.employeeJobs[position] || 0;
                const needed = targetCount - currentCount;

                if (needed > 0) {
                    allDone = false;
                    const hired = ns.corporation.hireEmployee(INDUSTRY, city, position);
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
            ns.print(`✓ All offices at 9 employees`);
            state.phase = 13;
        }
    }

    async function phase13_ScaleUp(ns, corp, state) {
        ns.print("=== PHASE 13: Scale Up Upgrades & Warehouses ===");

        if (state.subPhase === 0) {
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
            state.subPhase = 1;
        }

        if (state.subPhase === 1) {
            let allUpgraded = true;
            for (const city of CITIES) {
                const warehouse = ns.corporation.getWarehouse(INDUSTRY, city);
                if (warehouse.size < 1000) {
                    allUpgraded = false;
                    try {
                        const neededLevels = Math.min(7, Math.ceil((1000 - warehouse.size) / 100));
                        ns.corporation.upgradeWarehouse(INDUSTRY, city, neededLevels);
                        ns.print(`✓ Upgraded warehouse in ${city}`);
                    } catch (e) {
                        ns.print(`⏳ Can't afford warehouse upgrade in ${city}`);
                        return;
                    }
                }
            }

            if (allUpgraded) {
                ns.print(`✓ All warehouses at 1000`);
                state.subPhase = 2;
            }
        }

        if (state.subPhase === 2) {
            if (!state.materialsPhase4aDone) {
                let allPurchased = true;
                for (const city of CITIES) {
                    const hardware = ns.corporation.getMaterial(INDUSTRY, city, "Hardware");
                    const robots = ns.corporation.getMaterial(INDUSTRY, city, "Robots");
                    const aiCores = ns.corporation.getMaterial(INDUSTRY, city, "AI Cores");
                    const realEstate = ns.corporation.getMaterial(INDUSTRY, city, "Real Estate");

                    const hardwareNeeded = Math.max(0, 1400 - hardware.stored);
                    const robotsNeeded = Math.max(0, 48 - robots.stored);
                    const aiNeeded = Math.max(0, 1260 - aiCores.stored);
                    const realEstateNeeded = Math.max(0, 73200 - realEstate.stored);

                    if (hardwareNeeded > 0 || robotsNeeded > 0 || aiNeeded > 0 || realEstateNeeded > 0) {
                        let purchased = 0;
                        if (hardwareNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(INDUSTRY, city, "Hardware", hardwareNeeded);
                            if (result > 0) purchased++;
                        }
                        if (robotsNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(INDUSTRY, city, "Robots", robotsNeeded);
                            if (result > 0) purchased++;
                        }
                        if (aiNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(INDUSTRY, city, "AI Cores", aiNeeded);
                            if (result > 0) purchased++;
                        }
                        if (realEstateNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(INDUSTRY, city, "Real Estate", realEstateNeeded);
                            if (result > 0) purchased++;
                        }

                        if (purchased === 0) {
                            allPurchased = false;
                            ns.print(`⏳ ${city}: Waiting for funds`);
                        }
                    }
                }

                if (allPurchased) {
                    state.materialsPhase4aDone = true;
                    ns.print(`✓ Scale-up materials purchased`);
                }
                return;
            }

            state.phase = 14;
            state.subPhase = 0;
        }
    }

    async function phase14_SecondInvestment(ns, corp, state) {
        ns.print("=== PHASE 14: Wait for Second Investment ===");

        if (state.investmentRound === 1) {
            const offer = ns.corporation.getInvestmentOffer();
            if (offer.round === 2) {
                ns.print(`💰 Investment offer: $${ns.formatNumber(offer.funds)}`);
                if (offer.funds >= 5e12) {
                    ns.corporation.acceptInvestmentOffer();
                    ns.print(`✓ Accepted Round 2: $${ns.formatNumber(offer.funds)}`);
                    state.investmentRound = 2;
                    state.phase = 15;
                }
            }
        }
    }

    async function phase15_FinalScale(ns, corp, state) {
        ns.print("=== PHASE 15: Final Scale-Up ===");

        if (state.subPhase === 0) {
            let allUpgraded = true;
            for (const city of CITIES) {
                const warehouse = ns.corporation.getWarehouse(INDUSTRY, city);
                if (warehouse.size < 3800) {
                    allUpgraded = false;
                    try {
                        const neededLevels = Math.min(9, Math.ceil((3800 - warehouse.size) / 100));
                        ns.corporation.upgradeWarehouse(INDUSTRY, city, neededLevels);
                        ns.print(`✓ Upgraded warehouse in ${city}`);
                    } catch (e) {
                        ns.print(`⏳ Can't afford warehouse upgrade in ${city}`);
                        return;
                    }
                }
            }

            if (allUpgraded) {
                ns.print(`✓ All warehouses at 3800`);
                state.subPhase = 1;
            }
        }

        if (state.subPhase === 1) {
            if (!state.materialsPhase4bDone) {
                let allPurchased = true;
                for (const city of CITIES) {
                    const hardware = ns.corporation.getMaterial(INDUSTRY, city, "Hardware");
                    const robots = ns.corporation.getMaterial(INDUSTRY, city, "Robots");
                    const aiCores = ns.corporation.getMaterial(INDUSTRY, city, "AI Cores");
                    const realEstate = ns.corporation.getMaterial(INDUSTRY, city, "Real Estate");

                    const hardwareNeeded = Math.max(0, 9300 - hardware.stored);
                    const robotsNeeded = Math.max(0, 726 - robots.stored);
                    const aiNeeded = Math.max(0, 6270 - aiCores.stored);
                    const realEstateNeeded = Math.max(0, 230400 - realEstate.stored);

                    if (hardwareNeeded > 0 || robotsNeeded > 0 || aiNeeded > 0 || realEstateNeeded > 0) {
                        let purchased = 0;
                        if (hardwareNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(INDUSTRY, city, "Hardware", hardwareNeeded);
                            if (result > 0) purchased++;
                        }
                        if (robotsNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(INDUSTRY, city, "Robots", robotsNeeded);
                            if (result > 0) purchased++;
                        }
                        if (aiNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(INDUSTRY, city, "AI Cores", aiNeeded);
                            if (result > 0) purchased++;
                        }
                        if (realEstateNeeded > 0) {
                            const result = ns.corporation.bulkPurchase(INDUSTRY, city, "Real Estate", realEstateNeeded);
                            if (result > 0) purchased++;
                        }

                        if (purchased === 0) {
                            allPurchased = false;
                            ns.print(`⏳ ${city}: Waiting for funds`);
                        }
                    }
                }

                if (allPurchased) {
                    state.materialsPhase4bDone = true;
                    ns.print(`✓ Final materials purchased`);
                }
                return;
            }

            state.phase = 16;
            state.subPhase = 0;
        }
    }

    async function phase16_Maintenance(ns, corp, state) {
        ns.print("=== PHASE 16: Maintenance Mode ===");
        ns.print("Corporation is running!");
        ns.print(`Production Multiplier should be over 500`);

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
