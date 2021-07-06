pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BetterStaking is ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 private immutable _token;

    uint256 public totalStaked;
    uint256 public rewardPerToken;
    
    mapping(address => uint256) public staked;
    mapping(address => uint256) public magicPayoutCounter;

    event Staked(address staker, uint256 amount);
    event Unstaked(address staker, uint256 amount);
    event RewardClaimed(address staker, uint256 amount);
    event Distributed(uint256 amount);

    constructor (IERC20 token) {
        _token = token;
    }

    function stake(uint256 _amount) public nonReentrant {
        require(_amount > 0, "Amount should be grater than 0");

        _token.safeTransferFrom(msg.sender, address(this), _amount);
        staked[msg.sender] = staked[msg.sender] + _amount;
        magicPayoutCounter[msg.sender] = magicPayoutCounter[msg.sender] + rewardPerToken;
        totalStaked += _amount;

        emit Staked(msg.sender, _amount);
    }

    function getStake(address _staker) public view returns(uint256) {
        return staked[_staker];
    }

    function getPayoutCounter(address _staker) public view returns(uint256) {
        return magicPayoutCounter[_staker];
    }

    function calculateReward(address staker) public view returns(uint256) {
        return staked[staker] * rewardPerToken - magicPayoutCounter[staker];
    }

    function unstake(uint256 _amount) public nonReentrant {
        require(_amount <= staked[msg.sender], "Insufficient balance");
        require(_amount > 0, "Amount should be grater than 0");

        staked[msg.sender] = staked[msg.sender] - _amount;
        magicPayoutCounter[msg.sender] = magicPayoutCounter[msg.sender] - rewardPerToken * _amount;
        totalStaked = totalStaked - _amount;
        _token.safeTransfer(msg.sender, _amount);

        emit Unstaked(msg.sender, _amount);
    }

    function claimReward() public nonReentrant {
        uint256 reward = calculateReward(msg.sender);

        magicPayoutCounter[msg.sender] = staked[msg.sender] * rewardPerToken;
        _token.safeTransfer(msg.sender, reward);

        emit RewardClaimed(msg.sender, reward);
    }

    function distributeReward(uint256 reward) public nonReentrant {
        require(totalStaked > 0, "Pool with 0 stake");
        require(reward % totalStaked == 0, "The reward must be a multiple of the frozen funds");

        _token.safeTransferFrom(msg.sender, address(this), reward);
        rewardPerToken = rewardPerToken + reward / totalStaked;

        emit Distributed(reward);
    }
}
