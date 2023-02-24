import { Agent, InitConfig } from "@aries-framework/core";
import { agentDependencies } from "@aries-framework/node";

(async () => {
    const config: InitConfig = {
        label: "agente1",
        walletConfig: {
            id: "agente1",
            key: "key1"
        }
    }
    const agent = await new Agent({
        config, dependencies: agentDependencies
    })
    await agent.initialize();
})()