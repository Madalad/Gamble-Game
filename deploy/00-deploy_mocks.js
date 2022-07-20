const { network } = require("hardhat");
const {
    developmentChains,
    BASE_FEE,
    GAS_PRICE_LINK,
} = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...");
        await deploy("VRFCoordinatorV2Mock", {
            contract: "VRFCoordinatorV2Mock",
            from: deployer, // account deploying the contract
            log: true, // console.log progress
            args: [BASE_FEE, GAS_PRICE_LINK], // contstructor arguments
        });
        const vrfCoordinatorMock = await deployments.get(
            "VRFCoordinatorV2Mock"
        );
        //const subId = await vrfCoordinatorMock.createSubscription();
        //log(`Subscription ID: ${subId}`);
        log("Mocks deployed!");
        log("-----------------------------");
    }
};

module.exports.tags = ["all", "mocks"];
