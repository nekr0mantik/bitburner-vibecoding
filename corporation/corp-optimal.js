/** @param {NS} ns
 *
 * Optimal Corporation Strategy (2024 Official Guide)
 *
 * Round 1: Agriculture division, R&D to 55 RP, boost materials
 * Round 2: Chemical support division, export routes, RP farming
 * Round 3+: Tobacco product division, continuous product development
 */
export async function main(ns) {
    // Configuration
    const AGRICULTURE = "Agriculture";
    const CHEMICAL = "Chemical";
    const TOBACCO = "Tobacco";
    const CITIES = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
    const UPDATE_INTERVAL = 1000; // 1 second

    ns.disableLog("ALL");
    ns.clearLog();
    ns.tail();

    // State file
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
            round: 0,
            phase: 0,
            subPhase: 0,
            // Round 1 state
            agriOfficeUpgraded: false,
            rdWaitDone: false,
            jobsSwitched: false,
            boostMaterialsBought: false,
            // Round 2 state
            exportUnlocked: false,
            chemicalCreated: false,
            exportsSetup: false,
            rpWaitDone: false,
            // Round 3+ state
            tobaccoCreated: false,
            productCount: 0,
            lastProductName: ""
        };
    }

    function saveState(state) {
        ns.write(STATE_FILE, JSON.stringify(state), "w");
    }

    let state = loadState();

    ns.print("=== Optimal Corporation Strategy (2024) ===");
    ns.print(`Round: ${state.round} | Phase: ${state.phase}`);
    ns.print("");

    while (true) {
        try {
            const corp = ns.corporation.getCorporation();

            ns.clearLog();
            ns.print("=== Corporation Status ===");
            ns.print(`Round: ${state.round} | Phase: ${state.phase}.${state.subPhase}`);
            ns.print(`Funds: $${ns.formatNumber(corp.funds)}`);
            ns.print(`Revenue: $${ns.formatNumber(corp.revenue)}/s`);
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
            ns.print("");

            // Round determination
            if (state.round === 0) {
                state.round = 1;
            }

            // Phase execution based on round
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
        }

        await ns.sleep(UPDATE_INTERVAL);
    }

    // ========== ROUND 1: Agriculture Division ==========

    async function round1_Agriculture(ns, corp, state) {
        ns.print("=== ROUND 1: Agriculture Division ===");

        // Phase 0: Create Agriculture division
        if (state.phase === 0) {
            const divisions = corp.divisions || [];
            if (!divisions.includes(AGRICULTURE)) {
                try {
                    ns.corporation.expandIndustry(AGRICULTURE, AGRICULTURE);
                    ns.print(`✓ Created Agriculture division`);
                } catch (e) {
                    ns.print(`⏳ Waiting to create Agriculture`);
                    return;
                }
            }
            state.phase = 1;
        }

        // Phase 1: Expand to 6 cities and buy warehouses
        if (state.phase === 1) {
            const division = ns.corporation.getDivision(AGRICULTURE);
            const divisionCities = division.cities || [];

            // Expand to all cities
            for (const city of CITIES) {
                if (!divisionCities.includes(city)) {
                    try {
                        ns.corporation.expandCity(AGRICULTURE, city);
                        ns.print(`✓ Expanded to ${city}`);
                    } catch (e) {
                        ns.print(`⏳ Can't afford expansion to ${city}`);
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
                        ns.print(`✓ Purchased warehouse in ${city}`);
                    } catch (e) {
                        ns.print(`⏳ Can't afford warehouse in ${city}`);
                        return;
                    }
                }
            }

            ns.print(`✓ All cities expanded with warehouses`);
            state.phase = 2;
        }

        // Phase 2: Upgrade office size from 3 to 4
        if (state.phase === 2) {
            if (!state.agriOfficeUpgraded) {
                for (const city of CITIES) {
                    const office = ns.corporation.getOffice(AGRICULTURE, city);
                    if (office.size < 4) {
                        try {
                            ns.corporation.upgradeOfficeSize(AGRICULTURE, city, 1);
                            ns.print(`✓ Upgraded office in ${city} to 4`);
                        } catch (e) {
                            ns.print(`⏳ Can't afford office upgrade in ${city}`);
                            return;
                        }
                    }

                    // Hire 4th employee
                    if (office.numEmployees < 4) {
                        ns.corporation.hireEmployee(AGRICULTURE, city);
                        ns.print(`✓ Hired 4th employee in ${city}`);
                    }
                }
                state.agriOfficeUpgraded = true;
            }
            state.phase = 3;
        }

        // Phase 3: Set all 4 employees to R&D and wait for RP >= 55
        if (state.phase === 3) {
            if (!state.rdWaitDone) {
                const division = ns.corporation.getDivision(AGRICULTURE);

                // Assign all to R&D
                for (const city of CITIES) {
                    try {
                        ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Operations", 0);
                        ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Engineer", 0);
                        ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Business", 0);
                        ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Management", 0);
                        ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Research & Development", 4);
                    } catch (e) {
                        // Ignore
                    }
                }

                ns.print(`⏳ Waiting for RP >= 55 (current: ${division.researchPoints.toFixed(0)})`);

                if (division.researchPoints >= 55) {
                    state.rdWaitDone = true;
                    ns.print(`✓ RP threshold reached!`);
                }
                return;
            }
            state.phase = 4;
        }

        // Phase 4: Switch to Ops(1) + Eng(1) + Bus(1) + Mgmt(1)
        if (state.phase === 4) {
            if (!state.jobsSwitched) {
                for (const city of CITIES) {
                    try {
                        ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Operations", 1);
                        ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Engineer", 1);
                        ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Business", 1);
                        ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Management", 1);
                        ns.corporation.setAutoJobAssignment(AGRICULTURE, city, "Research & Development", 0);
                        ns.print(`✓ Set jobs in ${city}: Ops(1) Eng(1) Bus(1) Mgmt(1)`);
                    } catch (e) {
                        // Ignore
                    }
                }
                state.jobsSwitched = true;
            }
            state.phase = 5;
        }

        // Phase 5: Buy Smart Supply (or note to implement custom)
        if (state.phase === 5) {
            const hasSmartSupply = ns.corporation.hasUnlock("Smart Supply");
            if (!hasSmartSupply) {
                const cost = ns.corporation.getUnlockCost("Smart Supply");
                if (corp.funds >= cost) {
                    ns.corporation.purchaseUnlock("Smart Supply");
                    ns.print(`✓ Unlocked Smart Supply ($${ns.formatNumber(cost)})`);
                } else {
                    ns.print(`⏳ Need $${ns.formatNumber(cost)} for Smart Supply`);
                    ns.print(`   (Or implement custom Smart Supply script)`);
                    return;
                }
            }

            // Enable Smart Supply in all cities
            for (const city of CITIES) {
                try {
                    ns.corporation.setSmartSupply(AGRICULTURE, city, true);
                } catch (e) {
                    // Ignore
                }
            }

            state.phase = 6;
        }

        // Phase 6: Buy Smart Storage upgrades and 2 Advert levels
        if (state.phase === 6) {
            // Focus on Smart Storage
            const storageLevel = ns.corporation.getUpgradeLevel("Smart Storage");
            if (storageLevel < 2) {
                try {
                    ns.corporation.levelUpgrade("Smart Storage");
                    ns.print(`✓ Smart Storage to level ${storageLevel + 1}`);
                    return;
                } catch (e) {
                    ns.print(`⏳ Can't afford Smart Storage upgrade`);
                    return;
                }
            }

            // Buy 2 Advert levels
            const division = ns.corporation.getDivision(AGRICULTURE);
            const advertLevel = division.numAdVerts || 0;
            if (advertLevel < 2) {
                try {
                    ns.corporation.hireAdVert(AGRICULTURE);
                    ns.print(`✓ Hired AdVert ${advertLevel + 1}/2`);
                    return;
                } catch (e) {
                    ns.print(`⏳ Can't afford AdVert`);
                    return;
                }
            }

            state.phase = 7;
        }

        // Phase 7: Buy boost materials (TODO: find optimal quantities, buy per second not bulk)
        if (state.phase === 7) {
            if (!state.boostMaterialsBought) {
                ns.print("⏳ MANUAL: Buy boost materials per second (not bulk)");
                ns.print("   Find optimal quantities for Hardware, AI Cores, Real Estate");
                ns.print("   Set materialsPhase1Done = true when complete");
                // TODO: Implement optimal material calculation and purchase per second
                return;
            }

            ns.print(`✓ Round 1 complete! Ready for investment.`);
            ns.print(`   Accept investment when ready, then set round = 2`);
            // Wait for manual investment acceptance
        }
    }

    // ========== ROUND 2: Chemical Division ==========

    async function round2_Chemical(ns, corp, state) {
        ns.print("=== ROUND 2: Chemical Division + Exports ===");

        // TODO: Implement Round 2
        ns.print("⏳ Round 2 not yet implemented");
        ns.print("   1. Buy Export unlock");
        ns.print("   2. Upgrade Agriculture (office 8, advert 8)");
        ns.print("   3. Create Chemical division");
        ns.print("   4. Setup export routes");
        ns.print("   5. Wait for RP (700 Agri / 390 Chem)");
    }

    // ========== ROUND 3+: Tobacco Division ==========

    async function round3Plus_Tobacco(ns, corp, state) {
        ns.print("=== ROUND 3+: Tobacco Products ===");

        // TODO: Implement Round 3+
        ns.print("⏳ Round 3+ not yet implemented");
        ns.print("   1. Create Tobacco division");
        ns.print("   2. Export Plants from Agriculture");
        ns.print("   3. Develop products continuously");
        ns.print("   4. Buy Wilson + Advert (priority)");
        ns.print("   5. Get Market-TA2");
    }
}
