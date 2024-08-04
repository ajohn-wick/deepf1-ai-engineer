import { useEffect, useState } from 'react';
import { Amplify, Auth } from "aws-amplify";
import {
    Authenticator,
    Button,
} from "@aws-amplify/ui-react";
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import { AWSBRChat } from './components/chat';

import aws_exports from "./aws-exports";
Amplify.configure(aws_exports);

async function handleSignOut() {
    try {
        await Auth.signOut();
        
    } catch (error) {
        console.log('error signing out: ', error);
    }
}

function useAuthStatus() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      checkAuthStatus();
    }, []);
  
    async function checkAuthStatus() {
      try {
        // console.log("checkAuthStatus called");
        await Auth.currentAuthenticatedUser();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }
  
    return { isAuthenticated, isLoading };
}

  function BedrockChat() {
    const { isAuthenticated, isLoading } = useAuthStatus();
  
    useEffect(() => {
        chatFeature(isAuthenticated);
    }, [isAuthenticated]);
  
    async function chatFeature(userAuthenticated: boolean) {
        // console.log("chatFeature called");
        if (userAuthenticated) {
            new AWSBRChat({
                auth: {
                    region: aws_exports.aws_project_region,
                    cognito: {
                        userPoolId: aws_exports.aws_user_pools_id,
                        identityPoolId: aws_exports.aws_cognito_identity_pool_id
                    }
                },
                bedrock: {
                    region: aws_exports.aws_project_region,
                    modelId: "anthropic.claude-3-haiku-20240307-v1:0"
                    // agent: {
                    //     agentId: "",
                    //     agentAliasId: ""
                    // }
                },
                ui: {
                    logoUrl: "/bedrock_logo.png",
                    floatingWindow: false,
                    containerId: "chat-container",
                    webExperience: {
                        title: "AI Strategy Assistant",
                        subtitle: "Our advanced AI model analyze race data to provide cutting-edge recommendations.",
                        welcomeMessage: "It's Lights Out and Away We Go!"
                    }
                }
            });
        }
    }
  
    if (isLoading) {
      return <div>Loading...</div>;
    }
    if (isAuthenticated) {
        return (
            <div id="app">
                <div id="chat-container"></div>
            </div>
        );
    }
  }

const App = () => {
    return (
        <>
            <div id='bedrockChat'>
                <div className="logo-text"><h1>DeepF1</h1></div>
                <Authenticator>
                    {() => (
                        <>
                            <Button className="signOut" onClick={handleSignOut}>Sign Out</Button>
                            <BedrockChat />
                        </>
                    )}
                </Authenticator>
            </div>
        </>
    );
};

export default App;