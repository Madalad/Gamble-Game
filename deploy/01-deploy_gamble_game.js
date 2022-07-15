const { network } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    const subscriptionId = network.config.subscriptionId;
    const keyHash = network.config.keyHash;
    const vrfCoordinator = network.config.vrfCoordinator;

    const gambleGame = await deploy("GambleGamev4", {
        from: deployer,
        args: [subscriptionId, keyHash, vrfCoordinator],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    log("---------------------------------");
};

module.exports.tags = ["all", "gamblegame"];
