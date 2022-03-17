#!/bin/bash

pushd klay
./klay-deploy-and-test-transfer.sh
popd
pushd erc20
./erc20-deploy-and-test-transfer.sh
popd
pushd erc721
./erc721-deploy-and-test-transfer.sh
popd
pushd kip7
./kip7-deploy-and-test-transfer.sh
popd
pushd kip17
./kip17-deploy-and-test-transfer.sh
popd
