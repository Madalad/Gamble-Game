const developmentChains = ["hardhat", "localhost"];
const BASE_FEE = 100000;
const GAS_PRICE_LINK = 100000;
const networkConfig = {
    1: {
        name: "mainnet",
        ethUsdPriceFeedAddress: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
        vrfCoordinatorAddress: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
        vrfKeyHash:
            "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
    },
    4: {
        name: "rinkeby",
        ethUsdPriceFeedAddress: "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
        subscriptionId: 6014,
        vrfCoordinatorAddress: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        vrfKeyHash:
            "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    },
    31337: {
        name: "hardhat",
        subscriptionId: 1,
        vrfKeyHash:
            "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    },
    137: {
        name: "polygon",
        ethUsdPriceFeedAddress: "0xF9680D99D6C9589e2a93a78A04A279e509205945",
        vrfCoordinatorAddress: "0xAE975071Be8F8eE67addBC1A82488F1C24858067",
        vrfKeyHash:
            "0x6e099d640cde6de9d40ac749b4b594126b0169747122711109c9985d47751f93",
    },
};

module.exports = {
    developmentChains,
    BASE_FEE,
    GAS_PRICE_LINK,
    networkConfig,
};
