# Requirement
`bridge_info.json` should be properly set before running tests. See [configuration example](https://docs.klaytn.com/node/service-chain/getting-started/value-transfer)

# Install dependencies
`$ npm install`

# How to run
All the script files, ```*.sh``` sequantilly run contract deployment, one-step (`requestValueTransfer()`), and two-step (`approve()` and `requestXXXTransfer()`) transfers.
The `kscn` binary, ofifcially provided by Klaytn Team is currently not aware of one-step transfer handling from KIP7 and KIP17 token transfer reqeust and they are intentionally omitted.
Also, current NFT transfer example has a minor bug of URI loss, which means the URI value is always retrieved as empty after token transfer. This problem would be fixed in v1.18.1
### ERC-20
```
cd erc20
node erc20-deploy.js
// Copy the API usage output and paste it to your attached console.
// subbridge.registerBridge("0x272260dbA47d56A9Cef50D617b842f75c9BA3431", "0x9d10eCddb504b5573A05acb73BBc0642766C51C0")
// subbridge.subscribeBridge("0x272260dbA47d56A9Cef50D617b842f75c9BA3431", "0x9d10eCddb504b5573A05acb73BBc0642766C51C0")
// subbridge.registerToken("0x272260dbA47d56A9Cef50D617b842f75c9BA3431", "0x9d10eCddb504b5573A05acb73BBc0642766C51C0", "0xA8cD012D7d7b58F44169C0253B44Fc57e4C3fBF4", "0xf4406FD8904332d6B88AA128fDD2D4986037b4d9")
node erc20-transfer-1step.js
```

### ERC-721
```
cd erc721
node erc721-deploy.js
// Copy the API usage output and paste it to your attached console.
node erc721-transfer-1step.js
```

### KIP-7
```
cd kip7
node kip7-deploy.js
// Copy the API usage output and paste it to your attached console.
node kip7-transfer-2step-erc20-interface.js
```

### KIP-17
```
cd kip17
node kip17-deploy.js
// Copy the API usage output and paste it to your attached console.
node kip17-transfer-2step-erc721-interface.js
```

### KLAY
You must check if the sender that calls the transfer request has enough balance first.
```
cd klay
node klay-deploy.js
// Copy the API usage output and paste it to your attached console.
node klay-transfer.js
```

### Reference
- [Getting Started](https://ko.docs.klaytn.com/node/service-chain/getting-started)
- [Value Transfer Reference](https://ko.docs.klaytn.com/node/service-chain/references/value-transfer)

## How the KIP token can be transferred using ERC-dedicated bridge contract function and vice versa?
The function `requestValueTransfer()` from both KIP7 and KIP17 contracts are currently not supported. However, both KIP7 and KIP17 are compatiable with ERC20 and ERC721, respectively,
which means the token transfer would be possible through compatible interface contract. Our current bridge contract has built-in token transfer functions between chains.
Currently, `requestERC20Transfer()` and `requestERC721Transfer()` are supported and they are exploited to transfer the KIP7 and KIP17 standard token.
The functions consist of two steps: (1) Transfer the token first and (2) emit `RequestValueTransfer` event, which handled by the counterpart chain.
The standard implementation of token transfer is the same between KIP and ERC. Of course, modification can be made in those implementation by specific purpose, but the principal is not changed unless the developer have does satisfied the standard implementation.
Thus, token transfer would be done successfully. Second, the logic right after transfer the token contains burning the token, returning fee, and emit the corresponding event. They are currently not the modifiable context from third-party users.
Thus, the behavior is fixed. This is the techinical background how the KIP token can be transferred via ERC-dedicated bridge contract transfer function and vice versa.

## TODO
Both KIP7 and KIP17 bridge contracts would be supported corresponding `kscn` binary soon. If you want to experience it early, go to [klaytn-not-merged-yet](https://github.com/hyunsooda/klaytn/commits/SC-support-KIP7-KIP17) and compile it in your local environment.
`native-kip7` and `native-kip17` directories contain value transfer examples based on KIP-7 and KIP-17 contracts.

## Bridge Alias API
The current SC implementation does not have built-in bridge management for convinent bridge access.
Bridge alias is a new feature to be developed that allows to access specific bridge pair via alias access (to be released in v1.9.0). The PoC example of alias API is in `erc20/alias-erc20-deploy.js`.
