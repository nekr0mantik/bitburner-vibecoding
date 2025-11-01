/** @param {NS} ns
 *
 * Optimal Corporation Strategy (2024 Official Guide)
 *
 * This script follows the official 2024 corporation guide for optimal play.
 *
 * Round 1: Agriculture division, R&D farming, boost materials
 * Round 2: Chemical support division, export routes, RP farming
 * Round 3+: Tobacco product division, continuous product development
 */
export async function main(ns) {
    // Configuration
    const AGRICULTURE = "Agriculture";
    const CHEMICAL = "Chemical";
    const TOBACCO = "Tobacco";
    const CITIES = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
    const MAIN_OFFICE_CITY = "Sector-12"; // Where we develop products
    const UPDATE_INTERVAL = 200; // 200ms for better responsiveness

    ns.disableLog("ALL");
    ns.clearLog();
    ns.tail();

    const STATE_FILE = "/tmp/corp-optimal-state.txt";

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
            round: 1,
            phase: 0,
            // Round state tracking
            acceptedInvestment: [false, false, false, false], // Track which rounds accepted
            // Materials buying (per second, not bulk)
            buyingMaterials: false,
            materialTargets: {},
            productCounter: 0
        };
    }

    function saveState(state) {
        ns.write(STATE_FILE, JSON.stringify(state), "w");
    }

    /**
     * Buy tea/party to maintain employee morale and energy
     * Only for offices with 9+ employees (per guide)
     */
    function maintainEmployees(ns, divisionName, cities) {
        for (const city of cities) {
            try {
                const office = ns.corporation.getOffice(divisionName, city);

                // Only maintain morale/energy for offices with 9+ employees
                if (office.size < 9) {
                    continue;
                }

                // Buy tea if energy < 99
                if (office.avgEnergy < 99) {
                    try {
                        ns.corporation.buyTea(divisionName, city);
                    } catch (e) {
                        // Can't afford or already bought this cycle
                    }
                }

                // Throw party if morale < 99
                if (office.avgMorale < 99) {
                    try {
                        ns.corporation.throwParty(divisionName, city, 500000); // $500k party
                    } catch (e) {
                        // Can't afford
                    }
                }
            } catch (e) {
                // Office doesn't exist yet
            }
        }
    }

    /**
     * Buy materials per second (not bulk purchase)
     * Allows going into debt
     */
    function buyMaterialsPerSecond(ns, division, city, materialName, amountPerSecond) {
        try {
            ns.corporation.buyMaterial(division, city, materialName, amountPerSecond);
        } catch (e) {
            // Ignore errors
        }
    }

    /**
     * Stop buying materials
     */
    function stopBuyingMaterial(ns, division, city, materialName) {
        try {
            ns.corporation.buyMaterial(division, city, materialName, 0);
        } catch (e) {
            // Ignore
        }
    }

    let state = loadState();

    ns.print("=== Optimal Corporation Strategy (2024) ===");
    ns.print("");

    while (true) {
        try {
            const corp = ns.corporation.getCorporation();

            ns.clearLog();
            ns.print("=== Corporation Status ===");
            ns.print(`Round: ${state.round} | Phase: ${state.phase}`);
            ns.print(`Funds: $${ns.formatNumber(corp.funds)}`);
            ns.print(`Revenue: $${ns.formatNumber(corp.revenue)}/s`);
            ns.print(`Profit: $${ns.formatNumber(corp.revenue - corp.expenses)}/s`);
            ns.print(`State: ${corp.state}`);

            const divisions = corp.divisions || [];
            if (divisions.includes(AGRICULTURE)) {
                const agriDiv = ns.corporation.getDivision(AGRICULTURE);
                ns.print(`Agriculture RP: ${agriDiv.researchPoints.toFixed(0)}`);
            }
            if (divisions.includes(CHEMICAL)) {
                const chemDiv = ns.corporation.getDivision(CHEMICAL);
                ns.print(`Chemical RP: ${chemDiv.researchPoints.toFixed(0)}`);
            }
            if (divisions.includes(TOBACCO)) {
                const tobDiv = ns.corporation.getDivision(TOBACCO);
                ns.print(`Tobacco RP: ${tobDiv.researchPoints.toFixed(0)}`);
                ns.print(`Products: ${tobDiv.products.length}`);
            }
            ns.print("");

            // Maintain employees every cycle
            if (divisions.includes(AGRICULTURE)) {
                maintainEmployees(ns, AGRICULTURE, CITIES);
            }
            if (divisions.includes(CHEMICAL)) {
                maintainEmployees(ns, CHEMICAL, CITIES);
            }
            if (divisions.includes(TOBACCO)) {
                maintainEmployees(ns, TOBACCO, CITIES);
            }

            // Execute appropriate round
            if (state.round === 1) {
                await round1_Agriculture(ns, corp, state);
            } else if (state.round === 2) {
                await round2_Chemical(ns, corp, state);
            } else if (state.round >= 3) {
                await round3Plus_Tobacco(ns, corp, state);
            }

            saveState(state);

        } catch (error) {
            ns.print(`ERROR: ${error}`);
            ns.print(`Stack: ${error.stack}`);
        }

        await ns.sleep(UPDATE_INTERVAL);
    }

    // ========== ROUND 1: Agriculture Division ==========

    async function round1_Agriculture(ns, corp, state) {
        ns.print("=== ROUND 1: Agriculture ===");

        // Phase 0: Create Agriculture
        if (state.phase === 0) {
            const divisions = corp.divisions || [];
            if (!divisions.includes(AGRICULTURE)) {
                try {
                    ns.corporation.expandIndustry(AGRICULTURE, AGRICULTURE);
                    ns.print(`✓ Created Agriculture`);
                } catch (e) {
                    ns.print(`⏳ Waiting to create Agriculture`);
                    return;
                }
            }
            state.phase = 1;
        }

        // Phase 1: Expand to 6 cities + warehouses
        if (state.phase === 1) {
            const division = ns.corporation.getDivision(AGRICULTURE);
            const divisionCities = division.cities || [];

            // Expand cities
            for (const city of CITIES) {
                if (!divisionCities.includes(city)) {
                    try {
                        ns.corporation.expandCity(AGRICULTURE, city);
                        ns.print(`✓ Expanded to ${city}`);
                    } catch (e) {
                        ns.print(`⏳ Can't afford ${city}`);
                        return;
                    }
                }
            }

            // Buy warehouses
            for (const city of CITIES) {
                let hasWarehouse = true;
                try {
                    ns.corporation.getWarehouse(AGRICULTURE, city);
                } catch {
                    hasWarehouse = false;
                }

                if (!hasWarehouse) {
                    try {
                        ns.corporation.purchaseWarehouse(AGRICULTURE, city);
                        ns.print(`✓ Warehouse in ${city}`);
                    } catch (e) {
                        ns.print(`⏳ Can't afford warehouse in ${city}`);
                        return;
                    }
                }
            }

            state.phase = 2;
        }

        // Phase 2: Upgrade office 3→4, hire 4th employee
        if (state.phase === 2) {
            for (const city of CITIES) {
                let office = ns.corporation.getOffice(AGRICULTURE, city);
                if (office.size < 4) {
                    try {
                        ns.corporation.upgradeOfficeSize(AGRICULTURE, city, 1);
                        ns.print(`✓ Office 4 in ${city}`);
                        // Re-fetch office after upgrade
                        office = ns.corporation.getOffice(AGRICULTURE, city);
                    } catch (e) {
                        ns.print(`⏳ Can't afford office in ${city}`);
                        return;
                    }
                }

                // Hire to full capacity
                while (office.numEmployees < office.size) {
                    ns.corporation.hireEmployee(AGRICULTURE, city);
                    office = ns.corporation.getOffice(AGRICULTURE, city);
                }
            }
            state.phase = 3;
        }

        // Phase 3: All to R&D, wait for RP >= 55
        if (state.phase === 3) {
            const division = ns.corporation.getDivision(AGRICULTURE);

            // Set all to R&D
            for (const city of CITIES) {
                try {
                    // First, clear all other positions
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Operations", 0);
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Engineer", 0);
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Business", 0);
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Management", 0);
                    // Then assign all to R&D
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Research & Development", 4);
                } catch (e) {
                    ns.print(`ERROR assigning R&D in ${city}: ${e}`);
                }
            }

            ns.print(`⏳ Waiting for RP >= 55 (current: ${division.researchPoints.toFixed(0)})`);

            if (division.researchPoints >= 55) {
                ns.print(`✓ RP threshold reached!`);
                state.phase = 4;
            }
            return;
        }

        // Phase 4: Switch to balanced jobs
        if (state.phase === 4) {
            for (const city of CITIES) {
                try {
                    // Clear R&D first
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Research & Development", 0);
                    // Then set balanced jobs (1 each for 4 employees)
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Operations", 1);
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Engineer", 1);
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Business", 1);
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Management", 1);
                    ns.print(`✓ Jobs set in ${city}`);
                } catch (e) {
                    ns.print(`ERROR setting jobs in ${city}: ${e}`);
                }
            }
            state.phase = 5;
        }

        // Phase 5: Buy Smart Supply
        if (state.phase === 5) {
            const hasSmartSupply = ns.corporation.hasUnlock("Smart Supply");
            if (!hasSmartSupply) {
                try {
                    ns.corporation.purchaseUnlock("Smart Supply");
                    ns.print(`✓ Smart Supply unlocked`);
                } catch (e) {
                    ns.print(`⏳ Can't afford Smart Supply (${ns.formatNumber(ns.corporation.getUnlockCost("Smart Supply"))})`);
                    return;
                }
            }

            // Enable it
            for (const city of CITIES) {
                try {
                    ns.corporation.setSmartSupply(AGRICULTURE, city, true);
                } catch (e) {
                    // Ignore
                }
            }

            state.phase = 6;
        }

        // Phase 6: Smart Storage + 2 AdVerts
        if (state.phase === 6) {
            const storageLevel = ns.corporation.getUpgradeLevel("Smart Storage");
            if (storageLevel < 2) {
                try {
                    ns.corporation.levelUpgrade("Smart Storage");
                    ns.print(`✓ Smart Storage level ${storageLevel + 1}`);
                    return;
                } catch (e) {
                    ns.print(`⏳ Can't afford Smart Storage`);
                    return;
                }
            }

            const division = ns.corporation.getDivision(AGRICULTURE);
            const advertLevel = division.numAdVerts || 0;
            if (advertLevel < 2) {
                try {
                    ns.corporation.hireAdVert(AGRICULTURE);
                    ns.print(`✓ AdVert ${advertLevel + 1}/2`);
                    return;
                } catch (e) {
                    ns.print(`⏳ Can't afford AdVert`);
                    return;
                }
            }

            state.phase = 7;
        }

        // Phase 7: Buy boost materials (per second, not bulk)
        // Simple strategy: Hardware 125, AI 75, Real Estate 27000 per city
        if (state.phase === 7) {
            let allDone = true;

            for (const city of CITIES) {
                const hw = ns.corporation.getMaterial(AGRICULTURE, city, "Hardware");
                const ai = ns.corporation.getMaterial(AGRICULTURE, city, "AI Cores");
                const re = ns.corporation.getMaterial(AGRICULTURE, city, "Real Estate");

                // Buy if under target
                if (hw.stored < 125) {
                    buyMaterialsPerSecond(ns, AGRICULTURE, city, "Hardware", (125 - hw.stored) / 10);
                    allDone = false;
                } else {
                    stopBuyingMaterial(ns, AGRICULTURE, city, "Hardware");
                }

                if (ai.stored < 75) {
                    buyMaterialsPerSecond(ns, AGRICULTURE, city, "AI Cores", (75 - ai.stored) / 10);
                    allDone = false;
                } else {
                    stopBuyingMaterial(ns, AGRICULTURE, city, "AI Cores");
                }

                if (re.stored < 27000) {
                    buyMaterialsPerSecond(ns, AGRICULTURE, city, "Real Estate", (27000 - re.stored) / 10);
                    allDone = false;
                } else {
                    stopBuyingMaterial(ns, AGRICULTURE, city, "Real Estate");
                }
            }

            if (allDone) {
                // Enable selling
                for (const city of CITIES) {
                    try {
                        ns.corporation.sellMaterial(AGRICULTURE, city, "Plants", "MAX", "MP");
                        ns.corporation.sellMaterial(AGRICULTURE, city, "Food", "MAX", "MP");
                    } catch (e) {
                        // Ignore
                    }
                }

                ns.print(`✓ Round 1 complete!`);
                ns.print(`   Waiting for investment offer...`);
                state.phase = 8;
            }
        }

        // Phase 8: Accept investment
        if (state.phase === 8) {
            try {
                const offer = ns.corporation.getInvestmentOffer();
                if (offer.round === 1 && offer.funds > 0) {
                    ns.print(`💰 Round 1 offer: $${ns.formatNumber(offer.funds)}`);

                    // Accept if decent offer
                    if (offer.funds >= 200e9) { // At least $200b
                        ns.corporation.acceptInvestmentOffer();
                        ns.print(`✓ Accepted Round 1!`);
                        state.acceptedInvestment[1] = true;
                        state.round = 2;
                        state.phase = 0;
                    }
                }
            } catch (e) {
                ns.print(`Waiting for investment...`);
            }
        }
    }

    // ========== ROUND 2: Chemical Division ==========

    async function round2_Chemical(ns, corp, state) {
        ns.print("=== ROUND 2: Chemical + Exports ===");

        // Phase 0: Buy Export unlock
        if (state.phase === 0) {
            const hasExport = ns.corporation.hasUnlock("Export");
            if (!hasExport) {
                try {
                    ns.corporation.purchaseUnlock("Export");
                    ns.print(`✓ Export unlocked`);
                } catch (e) {
                    ns.print(`⏳ Can't afford Export`);
                    return;
                }
            }
            state.phase = 1;
        }

        // Phase 1: Upgrade Agriculture (office 8, advert 8)
        if (state.phase === 1) {
            let allDone = true;

            // Upgrade offices to 8
            for (const city of CITIES) {
                let office = ns.corporation.getOffice(AGRICULTURE, city);
                if (office.size < 8) {
                    try {
                        ns.corporation.upgradeOfficeSize(AGRICULTURE, city, 8 - office.size);
                        ns.print(`✓ Office 8 in ${city}`);
                        // Re-fetch office after upgrade
                        office = ns.corporation.getOffice(AGRICULTURE, city);
                    } catch (e) {
                        ns.print(`⏳ Can't afford office in ${city}`);
                        allDone = false;
                    }
                }

                // Hire to full
                while (office.numEmployees < office.size) {
                    ns.corporation.hireEmployee(AGRICULTURE, city);
                    // Re-fetch to get updated employee count
                    office = ns.corporation.getOffice(AGRICULTURE, city);
                }

                // Balanced jobs for now (clear R&D first, then assign)
                try {
                    const perJob = Math.floor(office.size / 4);
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Research & Development", 0);
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Operations", perJob);
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Engineer", perJob);
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Business", perJob);
                    ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Management", office.size - perJob * 3);
                } catch (e) {
                    ns.print(`ERROR setting jobs in ${city}: ${e}`);
                }
            }

            // Upgrade AdVert to 8
            const division = ns.corporation.getDivision(AGRICULTURE);
            const advertLevel = division.numAdVerts || 0;
            if (advertLevel < 8) {
                try {
                    ns.corporation.hireAdVert(AGRICULTURE);
                    ns.print(`✓ AdVert ${advertLevel + 1}/8`);
                    allDone = false;
                } catch (e) {
                    ns.print(`⏳ Can't afford AdVert`);
                    allDone = false;
                }
            }

            if (allDone) {
                state.phase = 2;
            }
        }

        // Phase 2: Create Chemical division
        if (state.phase === 2) {
            const divisions = corp.divisions || [];
            if (!divisions.includes(CHEMICAL)) {
                try {
                    ns.corporation.expandIndustry(CHEMICAL, CHEMICAL);
                    ns.print(`✓ Created Chemical`);
                } catch (e) {
                    ns.print(`⏳ Can't afford Chemical`);
                    return;
                }
            }

            // Expand to all cities
            const chemDiv = ns.corporation.getDivision(CHEMICAL);
            for (const city of CITIES) {
                if (!chemDiv.cities.includes(city)) {
                    try {
                        ns.corporation.expandCity(CHEMICAL, city);
                        ns.print(`✓ Chem in ${city}`);
                    } catch (e) {
                        return;
                    }
                }
            }

            // Buy minimal warehouses (1 upgrade)
            for (const city of CITIES) {
                let hasWarehouse = true;
                try {
                    ns.corporation.getWarehouse(CHEMICAL, city);
                } catch {
                    hasWarehouse = false;
                }

                if (!hasWarehouse) {
                    try {
                        ns.corporation.purchaseWarehouse(CHEMICAL, city);
                        const wh = ns.corporation.getWarehouse(CHEMICAL, city);
                        if (wh.size < 200) {
                            ns.corporation.upgradeWarehouse(CHEMICAL, city, 1);
                        }
                    } catch (e) {
                        return;
                    }
                }
            }

            // Hire 3 employees, all to R&D initially
            for (const city of CITIES) {
                let office = ns.corporation.getOffice(CHEMICAL, city);
                while (office.numEmployees < 3) {
                    ns.corporation.hireEmployee(CHEMICAL, city);
                    office = ns.corporation.getOffice(CHEMICAL, city);
                }

                try {
                    // Clear all positions first
                    ns.corporation.setAutoJobAssignment(CHEMICAL, city, "Operations", 0);
                    ns.corporation.setAutoJobAssignment(CHEMICAL, city, "Engineer", 0);
                    ns.corporation.setAutoJobAssignment(CHEMICAL, city, "Business", 0);
                    ns.corporation.setAutoJobAssignment(CHEMICAL, city, "Management", 0);
                    // Then assign to R&D
                    ns.corporation.setAutoJobAssignment(CHEMICAL, city, "Research & Development", 3);
                } catch (e) {
                    ns.print(`ERROR assigning R&D in Chemical ${city}: ${e}`);
                }
            }

            // Enable Smart Supply
            for (const city of CITIES) {
                try {
                    ns.corporation.setSmartSupply(CHEMICAL, city, true);
                } catch (e) {
                    // Ignore
                }
            }

            state.phase = 3;
        }

        // Phase 3: Setup export routes (Agri Plants → Chem)
        if (state.phase === 3) {
            for (const city of CITIES) {
                try {
                    // Export Plants from Agriculture to Chemical
                    ns.corporation.cancelExportMaterial(AGRICULTURE, city, CHEMICAL, city, "Plants");
                    ns.corporation.exportMaterial(AGRICULTURE, city, CHEMICAL, city, "Plants", "EINV");
                    ns.print(`✓ Export Plants: Agri ${city} → Chem ${city}`);
                } catch (e) {
                    // Already set or error
                }

                // Set Chemical to sell its output
                try {
                    ns.corporation.sellMaterial(CHEMICAL, city, "Chemicals", "MAX", "MP");
                } catch (e) {
                    // Ignore
                }
            }

            state.phase = 4;
        }

        // Phase 4: Wait for RP (700 Agri / 390 Chem)
        if (state.phase === 4) {
            const agriDiv = ns.corporation.getDivision(AGRICULTURE);
            const chemDiv = ns.corporation.getDivision(CHEMICAL);

            ns.print(`⏳ Waiting for RP: Agri ${agriDiv.researchPoints.toFixed(0)}/700, Chem ${chemDiv.researchPoints.toFixed(0)}/390`);

            // Switch Chemical to Engineers for quality
            if (chemDiv.researchPoints >= 100) {
                for (const city of CITIES) {
                    try {
                        // Clear positions first
                        ns.corporation.setAutoJobAssignment(CHEMICAL, city, "Operations", 0);
                        ns.corporation.setAutoJobAssignment(CHEMICAL, city, "Business", 0);
                        ns.corporation.setAutoJobAssignment(CHEMICAL, city, "Management", 0);
                        // Then assign: 2 Engineers, 1 R&D
                        ns.corporation.setAutoJobAssignment(CHEMICAL, city, "Engineer", 2);
                        ns.corporation.setAutoJobAssignment(CHEMICAL, city, "Research & Development", 1);
                    } catch (e) {
                        ns.print(`ERROR assigning Chemical jobs in ${city}: ${e}`);
                    }
                }
            }

            if (agriDiv.researchPoints >= 700 && chemDiv.researchPoints >= 390) {
                ns.print(`✓ RP thresholds reached!`);
                state.phase = 5;
            }
        }

        // Phase 5: Accept Round 2 investment
        if (state.phase === 5) {
            try {
                const offer = ns.corporation.getInvestmentOffer();
                if (offer.round === 2 && offer.funds > 0) {
                    ns.print(`💰 Round 2 offer: $${ns.formatNumber(offer.funds)}`);

                    if (offer.funds >= 5e12) { // At least $5t
                        ns.corporation.acceptInvestmentOffer();
                        ns.print(`✓ Accepted Round 2!`);
                        state.acceptedInvestment[2] = true;
                        state.round = 3;
                        state.phase = 0;
                    }
                }
            } catch (e) {
                ns.print(`Waiting for Round 2 investment...`);
            }
        }
    }

    // ========== ROUND 3+: Tobacco Division ==========

    async function round3Plus_Tobacco(ns, corp, state) {
        ns.print("=== ROUND 3+: Tobacco Products ===");

        // Phase 0: Create Tobacco division
        if (state.phase === 0) {
            const divisions = corp.divisions || [];
            if (!divisions.includes(TOBACCO)) {
                try {
                    ns.corporation.expandIndustry(TOBACCO, TOBACCO);
                    ns.print(`✓ Created Tobacco`);
                } catch (e) {
                    ns.print(`⏳ Can't afford Tobacco`);
                    return;
                }
            }

            // Expand to cities
            const tobDiv = ns.corporation.getDivision(TOBACCO);
            for (const city of CITIES) {
                if (!tobDiv.cities.includes(city)) {
                    try {
                        ns.corporation.expandCity(TOBACCO, city);
                    } catch (e) {
                        return;
                    }
                }
            }

            // Buy warehouses
            for (const city of CITIES) {
                let hasWarehouse = true;
                try {
                    ns.corporation.getWarehouse(TOBACCO, city);
                } catch {
                    hasWarehouse = false;
                }

                if (!hasWarehouse) {
                    try {
                        ns.corporation.purchaseWarehouse(TOBACCO, city);
                        // Upgrade warehouse for products
                        ns.corporation.upgradeWarehouse(TOBACCO, city, 5);
                    } catch (e) {
                        return;
                    }
                }
            }

            state.phase = 1;
        }

        // Phase 1: Setup export routes (Agri Plants → Tobacco)
        // IMPORTANT: Tobacco gets priority over Chemical (FIFO)
        if (state.phase === 1) {
            for (const city of CITIES) {
                try {
                    // Cancel existing exports from Agriculture
                    ns.corporation.cancelExportMaterial(AGRICULTURE, city, CHEMICAL, city, "Plants");
                    ns.corporation.cancelExportMaterial(AGRICULTURE, city, TOBACCO, city, "Plants");

                    // Re-add in correct order: Tobacco FIRST (FIFO)
                    ns.corporation.exportMaterial(AGRICULTURE, city, TOBACCO, city, "Plants", "EINV");
                    ns.corporation.exportMaterial(AGRICULTURE, city, CHEMICAL, city, "Plants", "EINV");

                    ns.print(`✓ Exports: Agri → Tobacco (priority), then Chemical`);
                } catch (e) {
                    // Ignore
                }
            }

            state.phase = 2;
        }

        // Phase 2: Setup offices (1 main + 5 support)
        if (state.phase === 2) {
            for (const city of CITIES) {
                let office = ns.corporation.getOffice(TOBACCO, city);

                // Main office (Sector-12) gets bigger
                const targetSize = city === MAIN_OFFICE_CITY ? 30 : 6;

                if (office.size < targetSize) {
                    try {
                        ns.corporation.upgradeOfficeSize(TOBACCO, city, targetSize - office.size);
                        // Re-fetch after upgrade
                        office = ns.corporation.getOffice(TOBACCO, city);
                    } catch (e) {
                        return;
                    }
                }

                // Hire to full
                while (office.numEmployees < office.size) {
                    ns.corporation.hireEmployee(TOBACCO, city);
                    office = ns.corporation.getOffice(TOBACCO, city);
                }

                // Job assignments
                if (city === MAIN_OFFICE_CITY) {
                    // Main office: Progress setup (prioritize dev speed)
                    const opsEng = Math.floor(office.size * 0.4);
                    const mgt = Math.floor(office.size * 0.2);
                    const rd = Math.floor(office.size * 0.1);
                    const bus = office.size - opsEng * 2 - mgt - rd;

                    try {
                        ns.corporation.setAutoJobAssignment(TOBACCO, city, "Operations", opsEng);
                        ns.corporation.setAutoJobAssignment(TOBACCO, city, "Engineer", opsEng);
                        ns.corporation.setAutoJobAssignment(TOBACCO, city, "Management", mgt);
                        ns.corporation.setAutoJobAssignment(TOBACCO, city, "Research & Development", rd);
                        ns.corporation.setAutoJobAssignment(TOBACCO, city, "Business", bus);
                    } catch (e) {
                        ns.print(`ERROR assigning jobs in Tobacco ${city}: ${e}`);
                    }
                } else {
                    // Support offices: All to R&D
                    try {
                        // Clear other positions first
                        ns.corporation.setAutoJobAssignment(TOBACCO, city, "Operations", 0);
                        ns.corporation.setAutoJobAssignment(TOBACCO, city, "Engineer", 0);
                        ns.corporation.setAutoJobAssignment(TOBACCO, city, "Business", 0);
                        ns.corporation.setAutoJobAssignment(TOBACCO, city, "Management", 0);
                        // Then assign all to R&D
                        ns.corporation.setAutoJobAssignment(TOBACCO, city, "Research & Development", office.size);
                    } catch (e) {
                        ns.print(`ERROR assigning R&D in Tobacco ${city}: ${e}`);
                    }
                }
            }

            state.phase = 3;
        }

        // Phase 3: Buy Wilson Analytics + Advert (continuous)
        if (state.phase === 3) {
            const wilson = ns.corporation.getUpgradeLevel("Wilson Analytics");
            const division = ns.corporation.getDivision(TOBACCO);

            // Try to buy Wilson if we can afford it
            if (corp.funds > 0) {
                try {
                    const cost = ns.corporation.getUpgradeLevelCost("Wilson Analytics");
                    if (corp.funds >= cost * 2) { // Only if we have 2x the cost
                        ns.corporation.levelUpgrade("Wilson Analytics");
                        ns.print(`✓ Wilson Analytics to level ${wilson + 1}`);
                    }
                } catch (e) {
                    // Can't afford
                }
            }

            // Spend 20% of funds on Advert
            const advertBudget = corp.funds * 0.2;
            try {
                const cost = ns.corporation.getHireAdVertCost(TOBACCO);
                if (advertBudget >= cost) {
                    ns.corporation.hireAdVert(TOBACCO);
                    ns.print(`✓ AdVert for Tobacco`);
                }
            } catch (e) {
                // Can't afford
            }

            state.phase = 4;
        }

        // Phase 4: Develop products continuously
        if (state.phase === 4) {
            const division = ns.corporation.getDivision(TOBACCO);

            // Check if we should develop a new product
            const developingProducts = division.products.filter(p => {
                try {
                    const prod = ns.corporation.getProduct(TOBACCO, MAIN_OFFICE_CITY, p);
                    return prod.developmentProgress < 100;
                } catch {
                    return false;
                }
            });

            // Start new product if none developing
            if (developingProducts.length === 0) {
                const productName = `Product-${state.productCounter}`;
                try {
                    ns.corporation.makeProduct(TOBACCO, MAIN_OFFICE_CITY, productName, 1e9, 1e9); // $1b each
                    ns.print(`✓ Developing ${productName}`);
                    state.productCounter++;
                } catch (e) {
                    ns.print(`⚠ Can't develop product: ${e}`);
                }
            }

            // Discontinue old products (keep newest 3)
            if (division.products.length > 3) {
                const oldestProduct = division.products[0];
                try {
                    ns.corporation.discontinueProduct(TOBACCO, oldestProduct);
                    ns.print(`✓ Discontinued ${oldestProduct}`);
                } catch (e) {
                    // Ignore
                }
            }

            state.phase = 5;
        }

        // Phase 5: Buy upgrades and research
        if (state.phase === 5) {
            // Buy Smart Factories and Smart Storage
            const factories = ns.corporation.getUpgradeLevel("Smart Factories");
            const storage = ns.corporation.getUpgradeLevel("Smart Storage");

            if (corp.funds > 1e12) {
                try {
                    ns.corporation.levelUpgrade("Smart Factories");
                    ns.print(`✓ Smart Factories to ${factories + 1}`);
                } catch (e) {
                    // Can't afford
                }

                try {
                    ns.corporation.levelUpgrade("Smart Storage");
                    ns.print(`✓ Smart Storage to ${storage + 1}`);
                } catch (e) {
                    // Can't afford
                }
            }

            // Buy research upgrades
            const division = ns.corporation.getDivision(TOBACCO);
            const researches = [
                "Hi-Tech R&D Laboratory",
                "Market-TA.I",
                "Market-TA.II",
                "Overclock",
                "Self-Correcting Assemblers",
                "uPgrade: Fulcrum",
                "uPgrade: Capacity.I",
                "uPgrade: Capacity.II"
            ];

            for (const research of researches) {
                if (division.hasResearch(research)) continue;

                try {
                    const cost = ns.corporation.getResearchCost(TOBACCO, research);
                    if (division.researchPoints >= cost * 2) { // Only if we have 2x
                        ns.corporation.research(TOBACCO, research);
                        ns.print(`✓ Researched ${research}`);
                    }
                } catch (e) {
                    // Can't afford or doesn't exist
                }
            }

            // Accept next investment if available
            try {
                const offer = ns.corporation.getInvestmentOffer();
                if (offer.round === 3 && !state.acceptedInvestment[3] && offer.funds >= 1e15) {
                    ns.corporation.acceptInvestmentOffer();
                    ns.print(`✓ Accepted Round 3!`);
                    state.acceptedInvestment[3] = true;
                }
            } catch (e) {
                // No offer yet
            }

            // Loop back to phase 3
            state.phase = 3;
        }
    }
}
