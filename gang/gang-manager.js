/** @param {NS} ns */
export async function main(ns) {
    // Configuration
    const MAX_GANG_MEMBERS = 12; // Hard cap in Bitburner
    const ASCENSION_MULTIPLIER_THRESHOLD = 2.0; // Ascend when new multiplier is 2x current
    const TERRITORY_CLASH_WIN_THRESHOLD = 0.95; // Enable clashes at 95% win chance
    const WANTED_PENALTY_THRESHOLD = 1.0; // Do vigilante work if penalty > 1% (wantedLevel/respect*100)
    const WARFARE_MEMBERS_COUNT = 6; // Number of members to assign to territory warfare
    const EQUIPMENT_PURCHASE_DELAY = 100; // ms between equipment purchases
    const TRAINING_STATS_THRESHOLD = 100; // Train until stats reach this level
    const TERRITORY_WAR_STATS_THRESHOLD = 300; // Switch to territory war after this
    const UPDATE_INTERVAL = 10000; // 10 seconds between main loop iterations

    // Task names in Bitburner
    const TASKS = {
        TRAIN_COMBAT: "Train Combat",
        TRAIN_HACKING: "Train Hacking",
        TRAIN_CHARISMA: "Train Charisma",
        TERRORISM: "Terrorism",
        VIGILANTE_JUSTICE: "Vigilante Justice",
        TERRITORY_WARFARE: "Territory Warfare",
        TRAFFIC_ARMS: "Traffick Illegal Arms",
        UNASSIGNED: "Unassigned"
    };

    ns.disableLog("ALL");
    ns.clearLog();
    ns.tail();

    // Load static configuration from file
    // Note: gang-start.js already verified we're in a gang before launching this script
    const configPath = "/tmp/gang-config.txt";
    if (!ns.fileExists(configPath)) {
        ns.print("ERROR: Configuration file not found!");
        ns.print("Please run gang/gang-start.js first.");
        return;
    }

    const configData = ns.read(configPath);
    const config = JSON.parse(configData);

    ns.print("=== Gang Manager Started ===");
    ns.print(`Gang: ${config.gangFaction}`);
    ns.print(`Equipment available: ${config.equipment.length}`);
    ns.print(`Ascension threshold: ${ASCENSION_MULTIPLIER_THRESHOLD}x`);
    ns.print(`Territory clash threshold: ${TERRITORY_CLASH_WIN_THRESHOLD * 100}%`);

    // Get initial member list once, then maintain it locally
    const members = ns.gang.getMemberNames();

    while (true) {
        try {
            // Get current gang information
            const gangInfo = ns.gang.getGangInformation();
            const territory = gangInfo.territory;

            // Calculate wanted level penalty
            const wantedPenalty = (gangInfo.wantedLevel / gangInfo.respect) * 100;

            ns.clearLog();
            ns.print("=== Gang Manager Status ===");
            ns.print(`Gang: ${gangInfo.faction}`);
            ns.print(`Members: ${members.length} / ${MAX_GANG_MEMBERS}`);
            ns.print(`Territory: ${(territory * 100).toFixed(2)}%`);
            ns.print(`Respect: ${ns.formatNumber(gangInfo.respect)}`);
            ns.print(`Wanted Level: ${ns.formatNumber(gangInfo.wantedLevel)}`);
            ns.print(`Wanted Penalty: ${wantedPenalty.toFixed(2)}% (keep low)`);
            ns.print("");

            // 1. Recruit new members
            await recruitMembers(ns, members);

            // 2. Check and perform ascensions
            await checkAscensions(ns, members);

            // 3. Manage equipment for all members
            await manageEquipment(ns, members, config.equipment);

            // 4. Assign tasks to members
            await assignTasks(ns, members, territory);

            // 5. Display task distribution
            displayTaskDistribution(ns, members);

            // 6. Manage territory warfare
            await manageTerritoryWarfare(ns, territory, config.otherGangs);

        } catch (error) {
            ns.print(`ERROR: ${error}`);
        }

        await ns.sleep(UPDATE_INTERVAL);
    }

    /**
     * Recruit new gang members when available
     */
    async function recruitMembers(ns, members) {
        let recruited = 0;
        while (ns.gang.canRecruitMember()) {
            const memberName = generateMemberName(members.length);
            if (ns.gang.recruitMember(memberName)) {
                members.push(memberName); // Add to local array
                ns.print(`✓ Recruited new member: ${memberName}`);
                recruited++;
            } else {
                break;
            }
        }
        if (recruited > 0) {
            ns.print(`Total recruited this cycle: ${recruited}`);
        }
    }

    /**
     * Generate a unique member name
     */
    function generateMemberName(index) {
        const names = [
            "Ghost", "Shadow", "Viper", "Reaper", "Blade", "Spike", "Rex",
            "Phoenix", "Raven", "Wolf", "Cobra", "Havoc", "Zero", "Ace",
            "Duke", "Hammer", "Steel", "Bullet", "Venom", "Razor", "Storm",
            "Knight", "Titan", "Frost", "Blaze", "Talon", "Fang", "Claw"
        ];

        if (index < names.length) {
            return names[index];
        }
        return `Member${index}`;
    }

    /**
     * Check and ascend members if their ascension bonus would double their current multipliers
     */
    async function checkAscensions(ns, members) {
        for (const member of members) {
            const ascensionResult = ns.gang.getAscensionResult(member);

            if (!ascensionResult) continue; // Can't ascend yet

            // Check if any multiplier would be >= 2x (doubled)
            const shouldAscend =
                ascensionResult.str >= ASCENSION_MULTIPLIER_THRESHOLD ||
                ascensionResult.def >= ASCENSION_MULTIPLIER_THRESHOLD ||
                ascensionResult.dex >= ASCENSION_MULTIPLIER_THRESHOLD ||
                ascensionResult.agi >= ASCENSION_MULTIPLIER_THRESHOLD ||
                ascensionResult.cha >= ASCENSION_MULTIPLIER_THRESHOLD;

            if (shouldAscend) {
                ns.gang.ascendMember(member);
                ns.print(`⬆ ASCENDED ${member}`);
                ns.print(`  STR: ${ascensionResult.str.toFixed(2)}x, DEF: ${ascensionResult.def.toFixed(2)}x`);
                ns.print(`  DEX: ${ascensionResult.dex.toFixed(2)}x, AGI: ${ascensionResult.agi.toFixed(2)}x`);
                ns.print(`  CHA: ${ascensionResult.cha.toFixed(2)}x`);
            }
        }
    }

    /**
     * Purchase equipment for gang members
     */
    async function manageEquipment(ns, members, equipmentList) {
        let purchasesMade = 0;

        for (const member of members) {
            const memberInfo = ns.gang.getMemberInformation(member);

            for (const equipment of equipmentList) {
                // Skip if member already has this equipment
                if (memberInfo.upgrades.includes(equipment) ||
                    memberInfo.augmentations.includes(equipment)) {
                    continue;
                }

                const cost = ns.gang.getEquipmentCost(equipment);

                // Only buy if we can afford it and have enough money left over
                if (ns.getServerMoneyAvailable("home") > cost * 2) {
                    if (ns.gang.purchaseEquipment(member, equipment)) {
                        ns.print(`💰 Bought ${equipment} for ${member} ($${ns.formatNumber(cost)})`);
                        purchasesMade++;
                        await ns.sleep(EQUIPMENT_PURCHASE_DELAY);
                    }
                }
            }
        }
    }

    /**
     * Assign tasks to gang members based on their stats, member count, wanted penalty, and current territory
     */
    async function assignTasks(ns, members, territory) {
        const gangInfo = ns.gang.getGangInformation();
        const fullyControlled = territory >= 0.999; // 100% territory (account for floating point)
        const maxMembers = members.length >= MAX_GANG_MEMBERS;

        // Calculate wanted level penalty: (wantedLevel / respect) * 100
        const wantedPenalty = (gangInfo.wantedLevel / gangInfo.respect) * 100;
        const highWantedPenalty = wantedPenalty > WANTED_PENALTY_THRESHOLD;

        // Get member info with combat stats
        const memberInfos = members.map(name => {
            const info = ns.gang.getMemberInformation(name);
            return {
                name: name,
                info: info,
                avgCombatStats: (info.str + info.def + info.dex + info.agi) / 4
            };
        });

        // Sort by combat stats (highest first) for warfare assignment
        const sortedByStats = [...memberInfos].sort((a, b) => b.avgCombatStats - a.avgCombatStats);

        // Track warfare assignments
        let warfareAssigned = 0;

        // Calculate how many members should do vigilante justice based on penalty level
        // Scale: 1 member per 2.5% penalty, up to half the gang (max 6)
        let vigilanteCount = 0;
        if (highWantedPenalty) {
            vigilanteCount = Math.min(
                Math.ceil(wantedPenalty / 2.5),  // 1 member per 2.5% penalty
                Math.floor(members.length / 2),   // Up to half the gang
                6                                  // Cap at 6 members max
            );
            ns.print(`⚠️  High wanted penalty detected (${wantedPenalty.toFixed(2)}%)`);
            ns.print(`   Assigning ${vigilanteCount} member${vigilanteCount !== 1 ? 's' : ''} to vigilante justice`);
        }
        let vigilanteAssigned = 0;

        for (const memberData of memberInfos) {
            const { name, info, avgCombatStats } = memberData;
            let newTask;

            if (fullyControlled) {
                // 100% territory - everyone does arms trafficking
                newTask = TASKS.TRAFFIC_ARMS;
            } else if (vigilanteAssigned < vigilanteCount && avgCombatStats >= TRAINING_STATS_THRESHOLD) {
                // High wanted penalty - assign multiple trained members to vigilante justice
                newTask = TASKS.VIGILANTE_JUSTICE;
                vigilanteAssigned++;
            } else if (avgCombatStats < TRAINING_STATS_THRESHOLD) {
                // Low stats - train combat first
                newTask = TASKS.TRAIN_COMBAT;
            } else if (!maxMembers) {
                // Trained but don't have max members - do terrorism for respect to recruit faster
                newTask = TASKS.TERRORISM;
            } else if (avgCombatStats < TERRITORY_WAR_STATS_THRESHOLD) {
                // Have max members but medium stats - continue training
                newTask = TASKS.TRAIN_COMBAT;
            } else {
                // High stats and max members - warfare phase
                // Only top 6 members do territory warfare to build power, rest do arms trafficking
                const isTopWarrior = sortedByStats.slice(0, WARFARE_MEMBERS_COUNT).some(m => m.name === name);

                if (isTopWarrior && warfareAssigned < WARFARE_MEMBERS_COUNT) {
                    newTask = TASKS.TERRITORY_WARFARE;
                    warfareAssigned++;
                } else {
                    // Lower-stat members or extras do arms trafficking for income
                    newTask = TASKS.TRAFFIC_ARMS;
                }
            }

            // Only change task if it's different
            if (info.task !== newTask) {
                ns.gang.setMemberTask(name, newTask);
                ns.print(`📋 ${name}: ${info.task} → ${newTask}`);
            }
        }
    }

    /**
     * Display task distribution across all gang members
     */
    function displayTaskDistribution(ns, members) {
        const taskCounts = {};

        // Count members assigned to each task
        for (const member of members) {
            const memberInfo = ns.gang.getMemberInformation(member);
            const task = memberInfo.task;

            if (!taskCounts[task]) {
                taskCounts[task] = 0;
            }
            taskCounts[task]++;
        }

        // Display task distribution
        ns.print("=== Task Distribution ===");
        const sortedTasks = Object.entries(taskCounts).sort((a, b) => b[1] - a[1]);

        for (const [task, count] of sortedTasks) {
            ns.print(`  ${task}: ${count} member${count !== 1 ? 's' : ''}`);
        }
        ns.print("");
    }

    /**
     * Manage territory warfare - enable clashes when win chance is high enough
     */
    async function manageTerritoryWarfare(ns, currentTerritory, otherGangs) {
        const gangInfo = ns.gang.getGangInformation();

        // If we have 100% territory, disable warfare
        if (currentTerritory >= 0.999) {
            if (gangInfo.territoryWarfareEngaged) {
                ns.gang.setTerritoryWarfare(false);
                ns.print("🏁 100% territory achieved! Disabling warfare.");
            }
            return;
        }

        // Calculate minimum win chance against all gangs
        let minWinChance = 1.0;
        let worstEnemy = "";

        for (const otherGang of otherGangs) {
            const otherGangInfo = ns.gang.getOtherGangInformation()[otherGang];
            if (otherGangInfo && otherGangInfo.territory > 0) {
                const winChance = ns.gang.getChanceToWinClash(otherGang);
                if (winChance < minWinChance) {
                    minWinChance = winChance;
                    worstEnemy = otherGang;
                }
            }
        }

        ns.print(`⚔️  Territory Warfare: ${gangInfo.territoryWarfareEngaged ? "ENABLED" : "DISABLED"}`);
        ns.print(`   Worst matchup: ${worstEnemy} (${(minWinChance * 100).toFixed(1)}% win chance)`);

        // Enable clashes if win chance is high enough, disable otherwise
        const shouldEngage = minWinChance >= TERRITORY_CLASH_WIN_THRESHOLD;

        if (shouldEngage && !gangInfo.territoryWarfareEngaged) {
            ns.gang.setTerritoryWarfare(true);
            ns.print(`✓ ENABLED territory clashes (${(minWinChance * 100).toFixed(1)}% win rate)`);
        } else if (!shouldEngage && gangInfo.territoryWarfareEngaged) {
            ns.gang.setTerritoryWarfare(false);
            ns.print(`✗ DISABLED territory clashes (${(minWinChance * 100).toFixed(1)}% win rate too low)`);
        }
    }
}
