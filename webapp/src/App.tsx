import { Amplify } from "aws-amplify";
import {
    Authenticator,
    Button,
} from "@aws-amplify/ui-react";
import '@aws-amplify/ui-react/styles.css';
import './App.css';

import aws_exports from "./aws-exports.js";
Amplify.configure(aws_exports);

const App = () => {

    return (
        <>
            <div className="logo-text"><h1>DeepF1</h1></div>
            <Authenticator>
                {({ signOut, user }) => (
                    <>
                        <Button className="signOut" onClick={signOut}>Sign Out</Button>
                        <div id="app">
                            <div id="chat-container"></div>
                        </div>

                    </>
                )}
            </Authenticator>
        </>
    );
};

export default App;