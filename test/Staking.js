const StakingContract = artifacts.require("Staking");
const ERC20TokenContract = artifacts.require("ERC20PresetFixedSupply");

const {
    BN,           // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    time, 
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

contract("Staking", async accounts => {
    let StakingInstance;
    let ERC20TokenInstance;
    
    before(async () => {
        ERC20TokenInstance = await ERC20TokenContract.new(
            "Token",
            "TKN",
            1_000_000_000,
            accounts[0]
        );
        StakingInstance = await StakingContract.new(ERC20TokenInstance.address);
    });

    it("Staking info should be empty", async () => {
        expect((await StakingInstance.totalStaked()).toNumber()).equal(0);
        expect((await StakingInstance.getStakersCount()).toNumber()).equal(0);
        expect((await ERC20TokenInstance.balanceOf(StakingInstance.address)).toNumber()).equals(0);
    });

    it("Stake without bad amount should fail", async () => {
        await expectRevert(
            StakingInstance.stake(
                0,
                {from: accounts[1]}
            ),
            'Amount should be grater than 0',
        );
    });

    it("Stake without approve should fail", async () => {
        await expectRevert(
            StakingInstance.stake(
                100,
                {from: accounts[1]}
            ),
            'revert',
        );
    });

    it("Different token stake should fail", async () => {
        let DifferentERC20TokenInstance = await ERC20TokenContract.new(
            "Token",
            "TKN",
            1_000_000_000,
            accounts[0]
        );
        DifferentERC20TokenInstance.approve(StakingInstance.address, 100);
        await expectRevert(
            StakingInstance.stake(
                100,
                {from: accounts[1]}
            ),
            'revert',
        );
    });

    it("User can stake", async () => {
        await ERC20TokenInstance.transfer(accounts[1], 100, {from: accounts[0]});
        await ERC20TokenInstance.approve(StakingInstance.address, 100, {from: accounts[1]});
        
        expectEvent(await StakingInstance.stake(
            100,
            {from: accounts[1]}
        ), 'Staked', {
            staker: accounts[1],
            amount: new BN(100),
        });
        expect((await StakingInstance.totalStaked()).toNumber()).equal(100);
        expect((await StakingInstance.getStakersCount()).toNumber()).equal(1);
        expect((await ERC20TokenInstance.balanceOf(StakingInstance.address)).toNumber()).equals(100);
        expect((await StakingInstance.getStake.call(accounts[1])).toNumber()).equal(100);
    });

    it("Failed staking should not affect on staked amount", async () => {        
        await expectRevert(
            StakingInstance.stake(
                100,
                {from: accounts[1]}
            ),
            'revert',
        );
        expect((await StakingInstance.totalStaked()).toNumber()).equal(100);
        expect((await StakingInstance.getStakersCount()).toNumber()).equal(1);
        expect((await ERC20TokenInstance.balanceOf(StakingInstance.address)).toNumber()).equals(100);
        expect((await StakingInstance.getStake.call(accounts[1])).toNumber()).equal(100);
    });

    it("Another user can stake", async () => {
        await ERC20TokenInstance.transfer(accounts[2], 5000, {from: accounts[0]});
        await ERC20TokenInstance.approve(StakingInstance.address, 5000, {from: accounts[2]});
        
        expectEvent(await StakingInstance.stake(
            5000,
            {from: accounts[2]}
        ), 'Staked', {
            staker: accounts[2],
            amount: new BN(5000),
        });
        expect((await StakingInstance.totalStaked()).toNumber()).equal(5100);
        expect((await StakingInstance.getStakersCount()).toNumber()).equal(2);
        expect((await ERC20TokenInstance.balanceOf(StakingInstance.address)).toNumber()).equals(5100);
        expect((await StakingInstance.getStake.call(accounts[2])).toNumber()).equal(5000);
    });

    it("User can stake more", async () => {
        await ERC20TokenInstance.transfer(accounts[1], 500, {from: accounts[0]});
        await ERC20TokenInstance.approve(StakingInstance.address, 500, {from: accounts[1]});
        
        expectEvent(await StakingInstance.stake(
            500,
            {from: accounts[1]}
        ), 'Staked', {
            staker: accounts[1],
            amount: new BN(500),
        });
        expect((await StakingInstance.totalStaked()).toNumber()).equal(5600);
        expect((await StakingInstance.getStakersCount()).toNumber()).equal(2);
        expect((await ERC20TokenInstance.balanceOf(StakingInstance.address)).toNumber()).equals(5600);
        expect((await StakingInstance.getStake.call(accounts[1])).toNumber()).equal(600);
    });

    it("User can do partial unstake", async () => {
        expectEvent(await StakingInstance.unstake(
            300,
            {from: accounts[1]}
        ), 'Unstaked', {
            staker: accounts[1],
            amount: new BN(300),
        });
        expect((await StakingInstance.totalStaked()).toNumber()).equal(5300);
        expect((await StakingInstance.getStakersCount()).toNumber()).equal(2);
        expect((await ERC20TokenInstance.balanceOf(StakingInstance.address)).toNumber()).equals(5300);
        expect((await ERC20TokenInstance.balanceOf(accounts[1])).toNumber()).equals(300);
        expect((await StakingInstance.getStake.call(accounts[1])).toNumber()).equal(300);
    });

    it("User can do full unstake", async () => {
        expectEvent(await StakingInstance.unstake(
            5000,
            {from: accounts[2]}
        ), 'Unstaked', {
            staker: accounts[2],
            amount: new BN(5000),
        });
        expect((await StakingInstance.totalStaked()).toNumber()).equal(300);
        expect((await StakingInstance.getStakersCount()).toNumber()).equal(2);
        expect((await ERC20TokenInstance.balanceOf(StakingInstance.address)).toNumber()).equals(300);
        expect((await ERC20TokenInstance.balanceOf(accounts[2])).toNumber()).equals(5000);
        expect((await StakingInstance.getStake.call(accounts[2])).toNumber()).equal(0);
    });

    it("Failed unstake should not affect on staked amount", async () => {
        await expectRevert(
            StakingInstance.unstake(
                1000,
                {from: accounts[3]}
            ),
            'Insufficient balance',
        );
        await expectRevert(
            StakingInstance.unstake(
                0,
                {from: accounts[1]}
            ),
            'Amount should be grater than 0',
        );
        await expectRevert(
            StakingInstance.unstake(
                301,
                {from: accounts[1]}
            ),
            'Insufficient balance',
        );
        expect((await StakingInstance.totalStaked()).toNumber()).equal(300);
        expect((await StakingInstance.getStakersCount()).toNumber()).equal(2);
        expect((await ERC20TokenInstance.balanceOf(StakingInstance.address)).toNumber()).equals(300);
        expect((await StakingInstance.getStake.call(accounts[1])).toNumber()).equal(300);
        expect((await StakingInstance.getStake.call(accounts[2])).toNumber()).equal(0);
    });

    it("Reward distribution", async () => {
        await ERC20TokenInstance.transfer(accounts[3], 50, {from: accounts[0]});
        await ERC20TokenInstance.transfer(accounts[4], 1, {from: accounts[0]});
        await ERC20TokenInstance.transfer(accounts[5], 449, {from: accounts[0]});
        await ERC20TokenInstance.transfer(accounts[6], 10000, {from: accounts[0]});

        await ERC20TokenInstance.approve(StakingInstance.address, 50, {from: accounts[3]});
        await ERC20TokenInstance.approve(StakingInstance.address, 1, {from: accounts[4]});
        await ERC20TokenInstance.approve(StakingInstance.address, 449, {from: accounts[5]});
        await ERC20TokenInstance.approve(StakingInstance.address, 10000, {from: accounts[6]});

        await StakingInstance.stake(50, {from: accounts[3]});
        await StakingInstance.stake(1, {from: accounts[4]});
        await StakingInstance.stake(449, {from: accounts[5]});
        await StakingInstance.stake(10000, {from: accounts[6]});

        await ERC20TokenInstance.approve(StakingInstance.address, 100_000, {from: accounts[0]});
        expectEvent(await StakingInstance.distributeReward(
            100_000,
            {from: accounts[0]}
        ), 'Distributed', {
            amount: new BN(99970),
        });
        expect((await StakingInstance.leftovers()).toNumber()).equals(30);

        expect((await ERC20TokenInstance.balanceOf(accounts[1])).toNumber()).equals(3070);
        expect((await ERC20TokenInstance.balanceOf(accounts[2])).toNumber()).equals(5000);
        expect((await ERC20TokenInstance.balanceOf(accounts[3])).toNumber()).equals(460);
        expect((await ERC20TokenInstance.balanceOf(accounts[4])).toNumber()).equals(0);
        expect((await ERC20TokenInstance.balanceOf(accounts[5])).toNumber()).equals(4150);
        expect((await ERC20TokenInstance.balanceOf(accounts[6])).toNumber()).equals(92590);
    });

    it("Reward distribution with leftovers", async () => {
        await StakingInstance.unstake(300, {from: accounts[1]});
        await StakingInstance.unstake(50, {from: accounts[3]});
        await StakingInstance.unstake(1, {from: accounts[4]});
        await StakingInstance.unstake(449, {from: accounts[5]});

        await ERC20TokenInstance.approve(StakingInstance.address, 1_080_000, {from: accounts[0]});
        expectEvent(await StakingInstance.distributeReward(
            1_080_000,
            {from: accounts[0]}
        ), 'Distributed', {
            amount: new BN(1_080_030),
        });
        expect((await StakingInstance.leftovers()).toNumber()).equals(0);
    });
});
