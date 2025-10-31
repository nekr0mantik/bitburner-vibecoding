/** @param {NS} ns */
export async function main(ns) {
    // Check if we're in a gang
    if (!ns.gang.inGang()) {
        ns.tprint("ERROR: Not in a gang! Please create a gang first.");
        return;
    }

    ns.tprint("=== Gathering Gang Configuration ===");

    // Hacking equipment to exclude (useless for combat gangs)
    const hackingEquipment = [
        "NUKE Rootkit",
        "Soulstealer Rootkit",
        "Hmap Node",
        "Demon Rootkit",
        "Jack the Ripper",
        "Bitwire",
        "Neuralstimulator",
        "DataJack"
    ];

    // Gather static information that doesn't change
    const config = {
        // List of all equipment (static) - filter out hacking equipment for combat gangs
        equipment: ns.gang.getEquipmentNames().filter(item => !hackingEquipment.includes(item)),

        // List of all other gangs (static)
        otherGangs: [
            "Slum Snakes",
            "Tetrads",
            "The Syndicate",
            "The Dark Army",
            "Speakers for the Dead",
            "NiteSec",
            "The Black Hand"
        ],

        // Current gang faction
        gangFaction: ns.gang.getGangInformation().faction
    };

    // Filter out the player's own gang from other gangs list
    config.otherGangs = config.otherGangs.filter(gang => gang !== config.gangFaction);

    // Write config to file
    const configPath = "/tmp/gang-config.txt";
    ns.write(configPath, JSON.stringify(config), "w");

    ns.tprint(`✓ Configuration saved to ${configPath}`);
    ns.tprint(`✓ Equipment items: ${config.equipment.length}`);
    ns.tprint(`✓ Enemy gangs: ${config.otherGangs.length}`);
    ns.tprint("");
    ns.tprint("Starting gang manager...");

    // Start the main manager script
    ns.spawn("gang/gang-manager.js", 1);
}
