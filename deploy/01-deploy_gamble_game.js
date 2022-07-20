const { network } = require("hardhat");
const {
    developmentChains,
    networkConfig,
} = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    const subscriptionId = networkConfig[chainId]["subscriptionId"];
    const keyHash = networkConfig[chainId]["vrfKeyHash"];

    let vrfCoordinator;

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorMock = await deployments.get(
            "VRFCoordinatorV2Mock"
        );
        vrfCoordinator = vrfCoordinatorMock.address;
    } else {
        vrfCoordinator = networkConfig[chainId]["vrfCoordinatorAddress"];
    }

    const gambleGame = await deploy("GambleGame", {
        from: deployer,
        args: [subscriptionId, keyHash, vrfCoordinator],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    log("---------------------------------");
};

module.exports.tags = ["all", "gamblegame"];
