import { task } from "hardhat/config";
import { getConfig, getState } from "./config";

task("setup", "Setup Zeitls Devils contracts")
    .setAction(async function (args, { network, ethers }) {
        const config = await getConfig(network.name);
        const contracts = getState(network.name).contracts();

        const Token = await ethers.getContractFactory("ZtlDevils");
        const token = Token.attach(contracts["ZtlDevils"].address);

        // make auction house as token minter
        let tx = await token.setMinter(contracts["ZtlDevilsAuctionHouse"].address);
        await tx.wait();
        console.log(`Link token contract with auction house: ${tx.hash}`);

        // update metadata
        tx = await token.updateMetadata(
            [config.metadata[0].id],
            [config.metadata[0].uri]
        );
        await tx.wait();
        console.log(`Update token metadata: ${tx.hash}`);

        const ZeitlsKey = await ethers.getContractFactory("ZtlKey");
        const zeitlsKey = ZeitlsKey.attach(contracts["ZtlKey"].address);

        tx = await zeitlsKey.mintBatch([
            "0x8b6AB2B941b2D07491f9a7F493Dc51e6f08a8FE6",
            "0x78D607f219a49915Bf5B45d8E6a2eBa597457Bf4",
            "0x978DC1A5978BBeD895B5d01BF82FB5229d31185b",
            "0x86a26f01cAFf39c28cf5d8dF1bAADC81749063eB",
            "0x0EeCCd3B48D7cAA3a516D808eE5aDA20fB660c3a",
            "0x4CEf98D34e5BBe12491CeF4D565FFBEb128A4B46",
            "0x952F3C482D3A7Ff3B6dEFC6b40DB7B9A0580a0B7",
            "0x60D9662fe7e79D17131ECc0Cc7E195406397199c",
            "0xcDbd7Fa89184EA15B1eA9b9bE05012654d022571",
            "0xe8F46Fd8F567c67D793d0c86dd6434e9E68029BA",
            "0xA567E497a1F13ca67B45dcfBbeB9D25078e1BA3f",
            "0x997A4DA805950bDDb557E51766462b9922Ad7C2e",
            "0x36337998611C162d4f9c933AbD5615522731f105",
            "0x90Df22cF040E779C8987aD03Bd42b66742830b19",
            "0x1EB4E259EAc3d97ceD2d88923eB3CCa5139019F7",
            "0xE1E9A5b0E05267F5EC4305EFD3389EBE2B93d954",
            "0xA6947993E0cc7B21a0b9D8e9379347C778340875",
            "0xf1Dc6507ef4E9400A935EfEd265F8e882c5444d5",
            "0x11b0820b32bCd57B81354944d3eCAFA09dFE27E6",
            "0xc49A88422Fd4a604B6bef2555E738FeE67Fd71FE",
            "0xD41F7a34BF33DefAB2476DcAD4391db0EACD4a08",
            "0x3418A956B1aDC06c85b4BA8D00fF265663a7d0aB",
            "0xFc75d61789A4567f9cd6f3d7deBAcAA7aDfE96aB",
            "0x80dAEc5719621Fde706700d7851e57E200F51a68",
            "0xb63ea4865cDfedF3A7bCa5Df5BD49F04D59ea348",
            "0x980F18a06a74005ff6BaA867fF617198db85a590",
            "0xf8298234C70d64457D56139FEAbbE3BE7122a65D",
            "0xbDd5D94E6463cF1683083A60774B38E7f3BC42B2",
            "0x62EaA51DCaC065ABb55EED7047785a0080e7DFb4",
            "0xfE3846E26417B218d72260A67032CDfDB17b3E25",
            "0x55eeD986579d26912c2Ecf5Fc9CdFc2c2e7271bA",
            "0x57825aefC6231b3d9ae7CF2b4773d5E841084645",
            "0xCEfF62CA06a0E764B9B16cBC4D3e0c2A05926728",
            "0x6DdFB08e52658964831217c9C08364802383d105",
            "0x16bB6E3BEfc3129428A48A0f4171c41b2688d94B",
            "0xEDE0C4684415266E88Ac4A964F91d08eF3aE587c",
            "0x46CeaF4dAEcAef4Eec657Cb75B385781Ae4c826B",
            "0x44938e22CDFc90e5Ab5e272E57217f42c19181C0",
            "0xE57f32529Ea8FA03d01f94E1d506cf00922C9c05",
            "0x51eDb088b39Fd1cE613Eb7fFb06503B83Ef35198",
            "0x27793f5b6324545Fe15085867b5f9E28c973D2d2",
            "0x4ca29272F210F7d2613Db7E509c387279285E5d0",
            "0x3e78DEE79AE8D6d96994cF138B15DDd3d2675d83",
            "0x1E7e68b0909b8732C65EC4DF3d1d9AF291f6dC9a",
            "0xF76F291913d37eD9a41B454201b6BD9830f772D8",
            "0x1400E0Bc62a2474a1B22E471c5A44aDd73326ddF",
            "0x7f04c4387423c5460f0a797b79B7De2A4769567A",
            "0xB3407F85880A874265c5eae427Db0Dcac866aDC1",
            "0x6443C23503c5e7743afB4bb3dA9B20E15A390EE2",
            "0x60330C9De429C6f8bC3e4A5Ae6F74b6F9f776b26",
            "0xaFC71c187c4be7aae2EB3ED1A5c070d01f726456",
            "0xC83b74bD86c92D0A59cC7cD3E430a262ad6601Ee",
            "0x7279A58d87C773621e1a71d08c31E5770FDbFaaE",
            "0xCf7f51347E9420268375dF12C6BaD832df233146",
            "0x157Aa38494c0659358Db3664145fF55344A1c814",
            "0x0F97F0886d5054867b98faE943eC366D8690aB50",
            "0xCBa583B2F8DC5a00bEA854c0a9d51b2e5Ad39853",
            "0xCb7C0B24C5aB22dB21D1B66EFA295b0424e174D7",
            "0xea4Feb8E55a17EeD317b2804e1F49040d1b43299",
            "0xc711FcBF97cD03F25CD1E1864380Fe4233A5C451",
            "0x4fB5Ae963c4fDa03D98Fc3ff8ff287FDF49dE548",
            "0x985e7d678EC6053eDF3BA421B9AD865127f0AA9E",
            "0xC68304E439E04b0eA0C0C07A021a26bF708F7669",
            "0xc05A5b07F8874dfd0630e76C364c4F3754deb357",
            "0x4831bd2E5d6ab2568870F963fEF1d96bd8c43546",
            "0x78C269eE1F90F93500ddEf91b97d6be2F0bF2d14",
            "0xA882fB71aA1967A6a8aa11375F8abd5FeE5BDD6a",
            "0x0c366CdeB15384A95f03866EEBB9f2882F1E4288",
            "0xAe150Fe9af090eCEdEd52dbADeDA6236f3acB865",
            "0xF73892A76d50cff31A601e24d603E80EadFB2F25",
            "0x2CF1E7137EFaE14caA26b9bD60cf16fd52D5157E",
            "0x20B3A40D948F7F8Efe0EEf35876c63a95984bcDE",
            "0x8219277a3ea5c1c2af71377b1c91aa7e4258910b",
            "0xE120edDd8A1FEA7D73AaD75d8eD8406988B2C98D",
            "0x886e792ACc66697BF6622a1176024dFd5C76776e",
            "0x9b5D3E67ce7B4A536c2E594bb3E827294Ad9D0a9",
            "0x333847B88CE2Db0Bc50CaDCd0D82A648b7Ba2306",
            "0x07666aBA90fBd20086CB9A22579d7b84bFf5Cbc8",
            "0x096571A14F9c1a5Ec896c19A1d15F601C03A2a3e",
            "0x28FBf57E2515272AD4C4bb452CAbd6e49521f2ef",
            "0x6A667D7E5067a37b009C72D06445AbC1963074F9",
            "0x34D2E305fb5fd7e9258F1Dd1494509b727a6c63e",
            "0x2E4814337382b1C1b9E8a0D1Db43140AF2e26BF9",
            "0xafF3680d51297AAaa1570cAfB4f2b28Cc978b68B",
            "0x05897583A484A150881dAc1DB56D226de0539c7a",
            "0x4DD7CB4ceBdFcc174785F65a8bd76b0255920b96",
            "0x79406b5ea49299fe74b171372f402e5f44ff6d71",
            "0x21d5996BBC760627D71F857f321249B61DA96351",
            "0x056Ac9EA2962f5cD274b073cD2be7343B426C5dc",
            "0x19dC51950eeCd6a6b84998dA6C15b92ef7982AcD",
            "0x8f13B78D91216932dC0Dc3367089650B4B5616a1",
            "0xb4441914e875c6adefe0094df0c3d1c7f31b3297",
            "0x0007bce60e2fa1d19c57d54d8ebc3105b2332ef0",
            "0x196d34dd5091a74e391b7f0ed2fe62328285a85a",
            "0xd9de53cb872b058b093377dc07a813d2016bebe8",
            "0xd4497a0a726d959568295ee67d74820d8b8a89b3",
            "0x62b90f03c2C1A7D86696b2Ef980cCcF883bb7277",
            "0x48C845488bA87C832760eEeb442a85eD11B91687",
            "0xFA31D66ae61335C0dF7Ac5F16D3AB98cCB890908",
            "0x91Eaf5071503ee35eA99cedbfd2fC9B9a83ff8FB",
            "0x5f1F51F416705fD10428ccA6623691c3Ab86764d",
            "0xD358171340eb400316224e67cfB3B329dA969365",
            "0x340A9748c530a1f00AFf2691F0c51C7f267e2F54",
            "0xb70EBD3CdE9cD5E4AaEB56E4EFB481b3D9ec852e",
            "0x97a3367C5F134CF67CA7547AAC1bc2f70DaDaFD9",
            "0x3c188E8F6C621d39E42aec2220D606875419bF41"
        ]);

        console.log(`Mint Zeitls Key: ${tx.hash}`);

        const Treasury = await ethers.getContractFactory("ZtlDevilsTreasury");
        const treasury = Treasury.attach(contracts["ZtlDevilsTreasury"].address);

        const affiliates: [string, number][] = [
            ["0xcb44e9963DB1534d483fBAF0bB72755bc169Fd7f", 25],
            ["0xf73f0c8ece7008Bf028942563e06b68B947331A0", 25],
        ];

        tx = await treasury.addAffiliates(
            affiliates.map(a => a[0]),
            affiliates.map(a => a[1])
        );

        console.log(`Affiliates added: ${tx.hash}`);
    });