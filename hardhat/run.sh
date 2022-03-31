#!/bin/bash
set -e

echo '' > state.conf
npx hardhat compile

echo "[+] Deploying contract to mainbridge"
npx hardhat deploy --network mainbridge

echo "[+] Deploying contract to subbridge"
npx hardhat deploy --network subbridge

echo "[+] Registering token to mainbridge"
npx hardhat regtoken --network mainbridge

echo "[+] Registering token to subbridge"
npx hardhat regtoken --network subbridge

echo "[+] Transferring mainbridge -> subbridge"
npx hardhat transfer --network mainbridge

echo "[+] Waiting 5 seconds"
sleep 5

echo "[+] Checking balance"
npx hardhat bal --network subbridge
