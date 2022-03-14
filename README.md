# Requirement

0. You need modified `kscn` binary, which is availalbe at [klaytn-not-merged-yet](https://github.com/hyunsooda/klaytn/commits/SC-support-KIP7-KIP17). If you do not have a plan to test KIP7 and KIP17 for now, then you can use origin `kscn` binary (Just skip this step).
Still, you can test KIP7 and KIP17 via ```XXX-transfer-2step-XXX.js``` since the KIP standard implementation is compatible with ERC. With this, the emitted events are from ERC contract, not KIP contract. Also, the corresponding transfer handler function is executed thorugh ERC contract, not KIP contract, which means your bridge contract must incorporate ERC standard implementation.
1. `deploy_conf.json` should be properly set before running tests. See [configuration example](https://ko.docs.klaytn.com/node/service-chain/getting-started/value-transfer)
2. Set `RPC_API="klay,subbridge"` in your `kscnd.conf`

# Install dependencies
`npm install`

# How to run
All the script files, ```*.sh``` sequantilly run contract deployment, one-step (`requestValueTransfer()`), and two-step (`approve()` and `requestXXXTransfer()`) transfers.
### ERC-20
```
cd erc20
./erc20-deploy-and-test-transfer.sh
```

### ERC-721
```
cd erc721
./erc721-deploy-and-test-transfer.sh
```

### KIP-7
```
cd kip7
./kip7-deploy-and-test-transfer.sh
```

### KIP-17
```
cd kip17
./kip17-deploy-and-test-transfer.sh
```

### KLAY
```
cd klay
```

### All
```
./run_all.sh
```

### Reference
- [Getting Started](https://ko.docs.klaytn.com/node/service-chain/getting-started)
- [Value Transfer Reference](https://ko.docs.klaytn.com/node/service-chain/references/value-transfer)
