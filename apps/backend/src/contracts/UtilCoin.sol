// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract UtilCoin is ERC20, ERC20Burnable, AccessControl, ERC20Permit {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address defaultAdmin)
        ERC20("Util Coin", "UTIL")
        ERC20Permit("Util Coin")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    // Função para converter UtilCoins em desconto
    function burnForDiscount(uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "Saldo insuficiente");
        _burn(msg.sender, amount);
        emit DiscountCreated(msg.sender, amount);
    }

    // Função para stake de tokens
    function stake(uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "Saldo insuficiente");
        _transfer(msg.sender, address(this), amount);
        emit TokensStaked(msg.sender, amount);
    }

    // Função para unstake de tokens
    function unstake(uint256 amount) public {
        require(stakedBalance[msg.sender] >= amount, "Saldo de stake insuficiente");
        _transfer(address(this), msg.sender, amount);
        emit TokensUnstaked(msg.sender, amount);
    }

    // Mapeamento para controlar o stake de cada usuário
    mapping(address => uint256) public stakedBalance;

    // Eventos
    event DiscountCreated(address indexed user, uint256 amount);
    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount);
}
