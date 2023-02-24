import { Agent, AutoAcceptCredential, BasicMessageEventTypes, BasicMessageStateChangedEvent, ConnectionEventTypes, ConnectionStateChangedEvent, CredentialEventTypes, CredentialState, CredentialStateChangedEvent, HttpOutboundTransport, InitConfig, WsOutboundTransport } from '@aries-framework/core'
import { IndyIssuerService } from '@aries-framework/core/build/modules/indy';
import { agentDependencies, HttpInboundTransport, WsInboundTransport } from '@aries-framework/node'
// agentDependencies.indy.setDefaultLogger('trace')

import { Schema } from 'indy-sdk'
import fetch from 'node-fetch'


const getGenesisTransaction = async (url: string) => {
    const response = await fetch(url)
    return await response.text()
}

const LEDGER = "http://localhost:9000/genesis" // 'http://test.bcovrin.vonx.io/genesis'
const createAgent = async (name: string, key: string, port: number, publicDid: string) => {
    const genesisTransactionsBCovrinTestNet = await getGenesisTransaction(LEDGER)

    const config: InitConfig = {
        label: name,
        walletConfig: {
            id: name,
            key
        },
        publicDidSeed: publicDid,

        autoAcceptConnections: true,
        autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
        endpoints: [`http://localhost:${port}`],
        indyLedgers: [
            {
                id: 'bcovrin-test-net',
                isProduction: false,
                indyNamespace: 'bcovrin:test',
                genesisTransactions: genesisTransactionsBCovrinTestNet,
            },
        ],
    }

    const agent = new Agent({ config, dependencies: agentDependencies })
    agent.registerOutboundTransport(new WsOutboundTransport())
    agent.registerOutboundTransport(new HttpOutboundTransport())
    agent.registerInboundTransport(new HttpInboundTransport({ port: port }))
    await agent.initialize();
    return agent;
};

const printAgent = async (agent: Agent) => {
    const walletOpen = await agent.wallet.generateNonce()
    console.log(walletOpen);

}

const createInvitation = async (agent: Agent) => {
    const outOfBandRecord = await agent.oob.createInvitation()
    return {
        outOfBandRecord,
        invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({ domain: "https://devtoday.com" })
    }
}

const receiveInvitation = async (agent: Agent, invitationUrl: string) => {
    const { outOfBandRecord } = await agent.oob.receiveInvitationFromUrl(invitationUrl)
    return outOfBandRecord
}
// suscribe event
const onEvent = (agent: Agent) => {
    agent.events.on<ConnectionStateChangedEvent>(ConnectionEventTypes.ConnectionStateChanged, data => {
        console.log(data.payload.connectionRecord.did)
        console.log(data.payload.connectionRecord.state)
    })
}

// suscribe event basic message
const onEventBasic = (agent: Agent) => {
    agent.events.on<BasicMessageStateChangedEvent>(BasicMessageEventTypes.BasicMessageStateChanged, data => {
        if (data.payload.basicMessageRecord.role == "receiver")
            console.log(data.payload.message.content, agent.config.label)
    })
}

const setupCredentialListener = (holder: Agent) => {
    holder.events.on<CredentialStateChangedEvent>(CredentialEventTypes.CredentialStateChanged, async ({ payload }) => {
        switch (payload.credentialRecord.state) {
            case CredentialState.OfferReceived:
                console.log('received a credential')
                // custom logic here
                await holder.credentials.acceptOffer({ credentialRecordId: payload.credentialRecord.id })
            case CredentialState.Done:
                console.log(`Credential for credential id ${payload.credentialRecord.id} is accepted`)
                // For demo purposes we exit the program here.
                process.exit(0)
        }
    })
}


// issue Credential 
const issueCredential = async (issuer: Agent, credentialDefinitionId: string, connectionId: string) =>
    issuer.credentials.offerCredential({
        protocolVersion: 'v1',
        connectionId,
        credentialFormats: {
            indy: {
                credentialDefinitionId,
                attributes: [
                    { name: 'name', value: 'Jane Doe' },
                    { name: 'age', value: '23' },
                ],
            },
        },
    });



(
    async () => {
        const alice = await createAgent("alice", "alice", 3001, 'demoissuerdidseed000000000000000')

        const bob = await createAgent("bob", "bob", 3002, 'demoagentholder00000000000000000')

        onEvent(alice)
        onEvent(bob)
        onEventBasic(alice)
        onEventBasic(bob)
        setupCredentialListener(bob)
        const invitation = await createInvitation(alice)
        const outBandRecord = await receiveInvitation(bob, invitation.invitationUrl)

        console.log('Registo del schema...')
        const schema = await alice.ledger.registerSchema({ attributes: ['name', 'age'], name: 'IdentityDEVTODAY2023-02', version: '1.0' })
        console.log('Registering the credential definition...')
        const credentialDefinition = await alice.ledger.registerCredentialDefinition({ schema, supportRevocation: false, tag: 'default' })

        setTimeout(async () => {
           
        }, 3000)

        let c = 0
        setInterval(async () => {

            const conns = await alice.connections.findAllByOutOfBandId(invitation.outOfBandRecord.id)
            console.log('Issuing the credential...')
            await issueCredential(alice, credentialDefinition.id, conns[0].id)

            const id = (await bob.connections.findAllByOutOfBandId(outBandRecord.id))[0].id
            await bob.basicMessages.sendMessage(id, (c++) + " bob -> alice")

          
            //console.log(conns)
            await alice.basicMessages.sendMessage(conns[0].id, `${c++} alice-bob`)
        }, 1000)
    }
)()


