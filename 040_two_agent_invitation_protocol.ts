import { Agent, ConnectionEventTypes, ConnectionStateChangedEvent, HttpOutboundTransport, InitConfig } from "@aries-framework/core"
import { agentDependencies, HttpInboundTransport } from "@aries-framework/node"


const createAgent = async (id: string, key: string, port: number) => {

    const config: InitConfig = {
        label: id,
        walletConfig: {
            id,
            key
        },
        autoAcceptConnections: true,
        endpoints: [`http://localhost:${port}`]

    }
    const agent = new Agent({ config, dependencies: agentDependencies })
    agent.registerOutboundTransport(new HttpOutboundTransport())
    agent.registerInboundTransport(new HttpInboundTransport({ port }))
    await agent.initialize();
    
    return agent
}

const onEvent = (agent: Agent) => {
    agent.events.on<ConnectionStateChangedEvent>(ConnectionEventTypes.ConnectionStateChanged, data => {
        console.log({state:data.payload.connectionRecord.state, ...agent.wallet.walletConfig})
        
    })
}

( async () => {

    const agent100 = await createAgent("agente100","agente100", 3000)
    const agent200 = await createAgent("agente200","agente200", 3001)
    onEvent(agent100)
    onEvent(agent200)
    const invitation = await agent100.oob.createInvitation()
    const url = await invitation.outOfBandInvitation.toUrl({domain: "http://kfs.es"})
    console.log(url)
    const invitacionagent200 = await agent200.oob.receiveInvitationFromUrl(url)

    console.log("inv", invitacionagent200)

})()