// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract demo2 {
  receive() external payable{}
  function withdraw(uint amount,address account) public {
    if(amount < 50000000000000000000){
    payable(account).transfer(amount);
    }
  }
}
 