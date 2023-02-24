import { Agent, InitConfig } from "@aries-framework/core";
import { agentDependencies } from "@aries-framework/node";
import fetch from 'node-fetch'


const LEDGER = "http://localhost:9000/genesis"
const getGenesis = async (url: string) => {
    const response = await fetch(url)
    return await response.text()
};


; (async () => {
    const g = await getGenesis(LEDGER);
    const config: InitConfig = {
        label: "agente1",
        walletConfig: {
            id: "agente1",
            key: "key1"
        },
        publicDidSeed : "genesis0000000000000000000000000",
        indyLedgers: [
            {
                id: 'bcovrin-test-net',
                isProduction: false,
                indyNamespace: 'bcovrin:test',
                genesisTransactions: g
            }
        ]
    }

    const agent = await new Agent({
        config, dependencies: agentDependencies
    })
    await agent.initialize();

    const schema = await agent.ledger.registerSchema({ attributes: ['name', 'age'], name: 'SCHEMA2', version: '1.0' })
    console.log("registrado", schema)
    const credentialDefinition = 
      await agent.ledger.registerCredentialDefinition({schema, supportRevocation: false, tag:"default"})
    console.log("registrada credencial ", credentialDefinition)
})()