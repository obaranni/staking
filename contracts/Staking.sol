pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol';

contract Staking {
    uint constant MULTIPLIER = 10000;
    IERC20 private immutable _token;

    uint256 public totalStaked;
    uint256 public leftovers;
    address[] public stakers;
    mapping(address => uint256) public stakes;

    event Staked(address staker, uint256 amount);
    event Unstaked(address staker, uint256 amount);
    event Distributed(uint256 amount);

    constructor (IERC20 token) {
        _token = token;
    }

    function stake(uint256 _amount) public {
        require(_amount > 0, "Amount should be grater than 0");
        require(_token.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");

        if (stakes[msg.sender] == 0) {
            stakes[msg.sender] = _amount;
            stakers.push(msg.sender);
        } else {
            stakes[msg.sender] += _amount;
        }
        totalStaked += _amount;

        emit Staked(msg.sender, _amount);
    }

    function unstake(uint256 _amount) public {
        require(_amount > 0, "Amount should be grater than 0");
        require(stakes[msg.sender] >= _amount, "Insufficient balance");        
        
        stakes[msg.sender] -= _amount;
        totalStaked -= _amount;
        require(_token.transfer(msg.sender, _amount), "Token transfer failed");
        emit Unstaked(msg.sender, _amount);
    }

    function distributeReward(uint256 _amount) public {
        require(_amount > 0, "Amount should be grater than 0");
        require(_token.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");

        uint256 reward;
        uint256 totalDistributed;
        uint256 amountToDistribute = _amount + leftovers;

        for (uint i = 0; i < stakers.length; i++) {
            reward = amountToDistribute * (stakes[stakers[i]] * MULTIPLIER / totalStaked) / MULTIPLIER;
            if (reward > 0) {
                _token.transfer(stakers[i], reward);
                totalDistributed += reward;
            }
        }
        leftovers = amountToDistribute - totalDistributed;
        emit Distributed(totalDistributed);
    }

    function getStakedPercentage(address _staker) public view returns(uint256) {
        return stakes[_staker] * MULTIPLIER / totalStaked;
    }

    function getStakersCount() public view returns(uint256) {
        return stakers.length;
    }

    function getStake(address _staker) public view returns(uint256 amount) {
        return stakes[_staker];
    }
}
