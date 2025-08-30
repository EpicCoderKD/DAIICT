// roles.js
import { ethers } from "ethers";

export const AUDITOR_ROLE   = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE"));
export const REGULATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGULATOR_ROLE"));
export const CONSUMER_ROLE  = ethers.keccak256(ethers.toUtf8Bytes("CONSUMER_ROLE"));
export const PRODUCER_ROLE  = ethers.keccak256(ethers.toUtf8Bytes("PRODUCER_ROLE"));
