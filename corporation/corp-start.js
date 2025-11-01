/** @param {NS} ns */
export async function main(ns) {
    const CORP_NAME = "MegaCorp";
    const INITIAL_INDUSTRY = "Agriculture";

    ns.disableLog("ALL");

    ns.tprint("=== Corporation Manager Startup ===");

    // Check if we have a corporation or can create one
    let hasCorp = false;
    try {
        const corp = ns.corporation.getCorporation();
        hasCorp = true;
        ns.tprint(`✓ Corporation exists: ${corp.name}`);
    } catch {
        // Try to create corporation
        try {
            ns.corporation.createCorporation(CORP_NAME, false); // false = self-funded
            ns.tprint(`✓ Created corporation: ${CORP_NAME}`);
            hasCorp = true;
        } catch (e) {
            ns.tprint("ERROR: Cannot create corporation!");
            ns.tprint("You need either:");
            ns.tprint("  - $150b for self-funded corporation");
            ns.tprint("  - Source-File 3 (BitNode 3)");
            return;
        }
    }

    if (!hasCorp) {
        ns.tprint("ERROR: No corporation found!");
        return;
    }

    // Get corporation info
    const corp = ns.corporation.getCorporation();

    // Check if we have divisions, if not create Agriculture
    let divisions = corp.divisions || [];
    if (divisions.length === 0) {
        try {
            ns.corporation.expandIndustry(INITIAL_INDUSTRY, INITIAL_INDUSTRY);
            ns.tprint(`✓ Created ${INITIAL_INDUSTRY} division`);
            divisions = [INITIAL_INDUSTRY];
        } catch (e) {
            ns.tprint(`ERROR: Could not create ${INITIAL_INDUSTRY} division: ${e}`);
            return;
        }
    }

    // Gather static configuration
    const config = {
        corpName: corp.name,
        initialIndustry: INITIAL_INDUSTRY,
        cities: ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"],

        // Employee positions
        positions: [
            "Operations",
            "Engineer",
            "Business",
            "Management",
            "Research & Development",
            "Training"
        ],

        // Materials for Agriculture industry
        agricultureMaterials: {
            "Water": 0,
            "Energy": 0,
            "Food": 0,
            "Plants": 0,
            "Hardware": 0,
            "Robots": 0,
            "AI Cores": 0,
            "Real Estate": 0
        }
    };

    // Write config to file
    const configPath = "/tmp/corp-config.txt";
    ns.write(configPath, JSON.stringify(config), "w");

    ns.tprint(`✓ Configuration saved to ${configPath}`);
    ns.tprint(`✓ Corporation: ${config.corpName}`);
    ns.tprint(`✓ Divisions: ${divisions.join(", ")}`);
    ns.tprint("");
    ns.tprint("Starting corporation manager...");

    // Start the main manager script
    ns.spawn("corporation/corp-manager.js", 1);
}
