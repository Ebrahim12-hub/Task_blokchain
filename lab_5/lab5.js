"use strict";
// required npm install blind-signatures
const blindSignatures = require('blind-signatures');

const { Coin, COIN_RIS_LENGTH, IDENT_STR, BANK_STR } = require('./coin.js');
const utils = require('./utils.js');

// Details about the bank's key.
const BANK_KEY = blindSignatures.keyGeneration({ b: 2048 });
const N = BANK_KEY.keyPair.n.toString();
const E = BANK_KEY.keyPair.e.toString();

/**
 * Function signing the coin on behalf of the bank.
 * 
 * @param blindedCoinHash - the blinded hash of the coin.
 * 
 * @returns the signature of the bank for this coin.
 */
function signCoin(blindedCoinHash) {
  console.log(" blindedCoinHash =",blindedCoinHash);
  console.log(" BANK_KEY =", BANK_KEY);
  return blindSignatures.sign({
      blinded: blindedCoinHash,
      key: BANK_KEY,
  });
}


/**
 * Parses a string representing a coin, and returns the left/right identity string hashes.
 *
 * @param {string} s - string representation of a coin.
 * 
 * @returns {[[string]]} - two arrays of strings of hashes, commiting the owner's identity.
 */
function parseCoin(s) {
  let [cnst,amt,guid,leftHashes,rightHashes] = s.split('-');
  if (cnst !== BANK_STR) {
    throw new Error(`Invalid identity string: ${cnst} received, but ${BANK_STR} expected`);
  }
  let lh = leftHashes.split(',');
  let rh = rightHashes.split(',');
  return [lh,rh];
}

/**
 * Procedure for a merchant accepting a token. The merchant randomly selects
 * the left or right halves of the identity string.
 * 
 * @param {Coin} coin - the coin that a purchaser wants to use.
 * 
 * @returns {[String]} - an array of strings, each holding half of the user's identity.
 */
function acceptCoin(coin) {
  if (!coin.verify(N, E)) {
    throw new Error('Invalid signature');
  }

  let [lh, rh] = parseCoin(coin.coinString());
  let ris = [];

  for (let i = 0; i < COIN_RIS_LENGTH; i++) {
    let chooseLeft = Math.random() < 0.5;
    ris.push(chooseLeft ? lh[i] : rh[i]);
  }

  return ris;
}

/**
 * If a token has been double-spent, determine who is the cheater
 * and print the result to the screen.
 * 
 * If the coin purchaser double-spent their coin, their anonymity
 * will be broken, and their idenityt will be revealed.
 * 
 * @param guid - Globablly unique identifier for coin.
 * @param ris1 - Identity string reported by first merchant.
 * @param ris2 - Identity string reported by second merchant.
 */
function determineCheater(guid, ris1, ris2) {
  console.log(`\nAnalyzing double-spend for coin GUID: ${guid}`);

  for (let i = 0; i < ris1.length; i++) {
    if (ris1[i] !== ris2[i]) {
      let xorResult = utils.xorHex(ris1[i], ris2[i]);
      if (xorResult.startsWith(IDENT_STR)) {
        let identity = xorResult.slice(IDENT_STR.length);
        console.log(`Double spender identified! Coin creator ID: ${identity}`);
        return;
      } else {
        console.log('One of the merchants is cheating. RIS mismatch without identity prefix.');
        return;
      }
    }
  }

  console.log('RIS strings are identical. One of the merchants reused the RIS.');
}

let coin = new Coin('alice', 20, N, E);

coin.signature = signCoin(coin.blinded);

coin.unblind();

// Merchant 1 accepts the coin.
let ris1 = acceptCoin(coin);

// Merchant 2 accepts the same coin.
let ris2 = acceptCoin(coin);

// The bank realizes that there is an issue and identifies Alice as the cheater.
determineCheater(coin.guid, ris1, ris2);

console.log();

// On the other hand, if the RIS strings are the same, the merchant is marked as the cheater.
determineCheater(coin.guid, ris1, ris1);
