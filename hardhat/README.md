# Klaytn ServiceChain Token Bridge with Hardhat

This project ports ServiceChain token test/deploy to hardhat.

## Testing on Hardhat network
Run the commands:

```
npm install
npx hardhat run scripts/deploy_and_transfer.js
```

Note that it deploys both bridge contracts and ServiceChain tokens on the same network, so it only gives you an idea how the whole procedure works.

## Testing on Klaytn test network
### Prerequisites
- Run `npm install`
- Include `eth` to `RPC_API` in `kend.conf` and `eth,subbridge` to `RPC_API` in `kscnd.conf`. The feature requires klaytn >= v1.8.0. Also, Klaytn should be restarted after you modify the configuration files.
- Customize `url`, `chainId`, `operator` in `hardhat.config.js` as follows:

```
mainbridge: {
  url: "http://127.0.0.1:8554",
  chainId: 1000,
  gasPrice: 25000000000,
      ...
  operator: '0x9388349e71140c1f099ca8293892ab0d1e151d4f',
},
subbridge: {
  url: "http://127.0.0.1:8555",
  chainId: 1001,
  gasPrice: 25000000000,
      ...
  operator: '0xcb5e2874276d3a96ab6331cafeb80baa6453eeb0',
},
```

You should adjust `gasPrice` with the current `gasPrice` value from your network. The default `gasPrice` in the template is set with the value from the Cypress network (i.e., 25 ston).

- Run `subbridge.anchroing(true)` in kscn

- The following address must have some Klay. Use faucet. Otherwise, you can change the `accounts` field with a preferred one.

```
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### Running
Run `./run.sh`. During execution, the following prompt will appear.

```
>>> Run the following commands in kscn:
subbridge.registerBridge("0xaaaaaaaa", "0xbbbbbbbb")
subbridge.subscribeBridge("0xaaaaaaaa", "0xbbbbbbbb")
subbridge.registerToken("0xaaaaaaaa", "0xbbbbbbbb", "0xcccccccc", "0xdddddddd")
====================================================================================================
Continue?
```

You need to run the output in attached kscn before continuing.
After running the commands, hit enter.

Successful output:

```
Balance of 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 : 100
```
