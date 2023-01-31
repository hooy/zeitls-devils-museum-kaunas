export default {
    openseaRegistry: "0xa5409ec958C83C3f309868babACA7c86DCB077c1",
    owner: "0x7AeA2070ec1be39Df1F67A58dbA6ce097442b082",                    // checked 
    maintainer: "0x0CbD644c7B56d6B075b51bA080BC350d1dEDFcfa",               // gnosis, 
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",                     // wrapped ETH, checked
    whitelistUri: "ipfs://QmZRn8pQCACNCWTydUZ62oNtEHbdnS3enxTkWEYXDjfxzj/", // checked
    signerKYC: "0x810cdfA7D49eC5a6C21DE02ECFbbA7A1ad64a76d",                // checked
    timeBuffer: 30 * 60, // 30 min
    duration: 72 * 60 * 60, // 72 hour
    minBidDiff: 5, // 5%
    metadata: [
        { id: 0, uri: "https://api.zeitls.ch/nfts/" },
    ],
};
